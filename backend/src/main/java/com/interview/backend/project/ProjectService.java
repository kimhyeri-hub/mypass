package com.interview.backend.project;

import com.interview.backend.project.dto.ProjectCreateRequest;
import com.interview.backend.project.dto.ProjectResponse;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
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

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
    }
}
