package com.interview.backend.project;

import com.interview.backend.project.dto.ProjectFileResponse;
import com.interview.backend.project.dto.ProjectResponse;
import com.interview.backend.storage.FileStorageService;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProjectService {

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

    private static final String PDF_CONTENT_TYPE = "application/pdf";

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
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));

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

    public List<ProjectResponse> getMyProjects(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));

        return projectRepository.findByUserId(user.getUserId()).stream()
                .map(project -> {
                    List<ProjectFileResponse> files = projectFileRepository.findByProjectId(project.getProjectId()).stream()
                            .map(ProjectFileResponse::from)
                            .toList();
                    return ProjectResponse.from(project, files);
                })
                .toList();
    }

    public ProjectResponse getProject(String userEmail, Long projectId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));

        if (!project.getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 프로젝트만 조회할 수 있습니다.");
        }

        List<ProjectFileResponse> files = projectFileRepository.findByProjectId(project.getProjectId()).stream()
                .map(ProjectFileResponse::from)
                .toList();
        return ProjectResponse.from(project, files);
    }
}
