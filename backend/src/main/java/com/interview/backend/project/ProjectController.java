package com.interview.backend.project;

import com.interview.backend.project.dto.ProjectResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            Authentication authentication,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String techStack,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String mainFeatures,
            @RequestParam(required = false) String problemSolving,
            @RequestParam(value = "files", required = false) List<MultipartFile> files
    ) {
        ProjectResponse response = projectService.createProject(
                authentication.getName(), title, description, techStack, role, mainFeatures, problemSolving, files
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getMyProjects(Authentication authentication) {
        return ResponseEntity.ok(projectService.getMyProjects(authentication.getName()));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProject(Authentication authentication, @PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.getProject(authentication.getName(), projectId));
    }
}
