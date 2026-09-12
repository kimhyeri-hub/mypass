package com.interview.backend.project;

import com.interview.backend.project.dto.ProjectResponse;
import com.interview.backend.project.dto.UpdateProjectRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PatchMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            Authentication authentication,
            @PathVariable Long projectId,
            @RequestBody UpdateProjectRequest request
    ) {
        return ResponseEntity.ok(projectService.updateProject(authentication.getName(), projectId, request));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(Authentication authentication, @PathVariable Long projectId) {
        projectService.deleteProject(authentication.getName(), projectId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{projectId}/files/{fileId}/download")
    public ResponseEntity<Resource> downloadFile(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long fileId
    ) {
        ProjectFileDownload download = projectService.downloadFile(authentication.getName(), projectId, fileId);

        MediaType contentType;
        try {
            contentType = MediaType.parseMediaType(download.file().getFileType());
        } catch (Exception e) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.file().getOriginalName() + "\"")
                .body(download.resource());
    }
}
