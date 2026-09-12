package com.interview.backend.project;

import com.interview.backend.project.dto.ProjectFileResponse;
import com.interview.backend.project.dto.ProjectResponse;
import com.interview.backend.project.dto.UpdateProjectRequest;
import com.interview.backend.storage.FileStorageService;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProjectService {

    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public ProjectService(
            ProjectRepository projectRepository,
            ProjectFileRepository projectFileRepository,
            UserRepository userRepository,
            FileStorageService fileStorageService
    ) {
        this.projectRepository = projectRepository;
        this.projectFileRepository = projectFileRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public ProjectResponse createProject(
            String userEmail,
            String title,
            String description,
            String techStack,
            String role,
            String mainFeatures,
            String problemSolving,
            List<MultipartFile> files
    ) {
        User user = getUser(userEmail);

        if (files != null) {
            files.stream().filter(f -> !f.isEmpty()).forEach(this::validatePdf);
        }

        Project project = new Project(user.getUserId(), title, description, techStack, role, mainFeatures, problemSolving);
        projectRepository.save(project);

        List<ProjectFileResponse> fileResponses = files == null ? List.of() : files.stream()
                .filter(f -> !f.isEmpty())
                .map(f -> saveFile(project.getProjectId(), f))
                .map(ProjectFileResponse::from)
                .toList();

        return ProjectResponse.from(project, fileResponses);
    }

    public List<ProjectResponse> getMyProjects(String userEmail) {
        User user = getUser(userEmail);

        return projectRepository.findByUserId(user.getUserId()).stream()
                .map(project -> ProjectResponse.from(project, getFileResponses(project.getProjectId())))
                .toList();
    }

    public ProjectResponse getProject(String userEmail, Long projectId) {
        User user = getUser(userEmail);
        Project project = getOwnedProject(user, projectId);
        return ProjectResponse.from(project, getFileResponses(project.getProjectId()));
    }

    @Transactional
    public ProjectResponse updateProject(String userEmail, Long projectId, UpdateProjectRequest request) {
        User user = getUser(userEmail);
        Project project = getOwnedProject(user, projectId);

        if (StringUtils.hasText(request.title())) {
            project.setTitle(request.title());
        }
        if (request.description() != null) {
            project.setDescription(request.description());
        }
        if (request.techStack() != null) {
            project.setTechStack(request.techStack());
        }
        if (request.role() != null) {
            project.setRole(request.role());
        }
        if (request.mainFeatures() != null) {
            project.setMainFeatures(request.mainFeatures());
        }
        if (request.problemSolving() != null) {
            project.setProblemSolving(request.problemSolving());
        }
        projectRepository.save(project);

        return ProjectResponse.from(project, getFileResponses(project.getProjectId()));
    }

    @Transactional
    public void deleteProject(String userEmail, Long projectId) {
        User user = getUser(userEmail);
        Project project = getOwnedProject(user, projectId);

        List<ProjectFile> files = projectFileRepository.findByProjectId(project.getProjectId());

        // DB 삭제(FK ON DELETE CASCADE로 project_files/interview_sessions 등 연쇄 삭제)를 먼저 하고,
        // 실제 저장된 파일은 별도로 지운다 (로컬 디스크든 나중의 S3든 이 서비스가 책임짐).
        projectRepository.delete(project);
        files.forEach(f -> fileStorageService.delete(f.getS3Key()));
    }

    private void validatePdf(MultipartFile file) {
        String contentType = file.getContentType();
        String name = file.getOriginalFilename();
        boolean isPdf = PDF_CONTENT_TYPE.equals(contentType) || (name != null && name.toLowerCase().endsWith(".pdf"));
        if (!isPdf) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF 파일만 업로드할 수 있습니다: " + name);
        }
    }

    private ProjectFile saveFile(Long projectId, MultipartFile file) {
        String storageKey = fileStorageService.store(file);
        ProjectFile projectFile = new ProjectFile(
                projectId,
                file.getOriginalFilename(),
                file.getContentType(),
                storageKey
        );
        return projectFileRepository.save(projectFile);
    }

    private List<ProjectFileResponse> getFileResponses(Long projectId) {
        return projectFileRepository.findByProjectId(projectId).stream()
                .map(ProjectFileResponse::from)
                .toList();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
    }

    private Project getOwnedProject(User user, Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));
        if (!project.getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 프로젝트만 접근할 수 있습니다.");
        }
        return project;
    }
}
