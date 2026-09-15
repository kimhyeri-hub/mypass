package com.interview.backend.project;

import com.interview.backend.document.service.PdfService;
import com.interview.backend.project.dto.ProjectCreateRequest;
import com.interview.backend.project.dto.ProjectResponse;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final PdfService pdfService;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository, PdfService pdfService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.pdfService = pdfService;
    }

    public ProjectResponse createProject(String email, ProjectCreateRequest request) {
        User user = findUser(email);
        Project project = new Project(user.getUserId(), request.title(), request.jobPosition());
        return ProjectResponse.from(projectRepository.save(project));
    }

    public List<ProjectResponse> getMyProjects(String email) {
        User user = findUser(email);
        return projectRepository.findByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .map(ProjectResponse::from)
                .toList();
    }

    public ProjectResponse attachDocument(String email, Long projectId, MultipartFile file) {
        Project project = getOwnedProject(email, projectId);

        String parsedText;
        try {
            parsedText = pdfService.extractText(file);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF 파싱 중 오류가 발생했습니다.", e);
        }

        project.setParsedText(parsedText);
        return ProjectResponse.from(projectRepository.save(project));
    }

    public Project getOwnedProject(String email, Long projectId) {
        User user = findUser(email);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));

        if (!project.getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 프로젝트만 접근할 수 있습니다.");
        }

        return project;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
    }
}
