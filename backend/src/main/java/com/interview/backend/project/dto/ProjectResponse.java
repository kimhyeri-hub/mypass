package com.interview.backend.project.dto;

import com.interview.backend.project.Project;

import java.time.LocalDateTime;
import java.util.List;

public record ProjectResponse(
        Long projectId,
        String title,
        String description,
        String techStack,
        String role,
        String mainFeatures,
        String problemSolving,
        LocalDateTime createdAt,
        List<ProjectFileResponse> files
) {
    public static ProjectResponse from(Project project, List<ProjectFileResponse> files) {
        return new ProjectResponse(
                project.getProjectId(),
                project.getTitle(),
                project.getDescription(),
                project.getTechStack(),
                project.getRole(),
                project.getMainFeatures(),
                project.getProblemSolving(),
                project.getCreatedAt(),
                files
        );
    }
}
