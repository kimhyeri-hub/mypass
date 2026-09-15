package com.interview.backend.project.dto;

import com.interview.backend.project.Project;

import java.time.LocalDateTime;

public record ProjectResponse(
        Long id,
        String title,
        String jobPosition,
        LocalDateTime createdAt
) {
    public static ProjectResponse from(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getTitle(),
                project.getJobPosition(),
                project.getCreatedAt());
    }
}
