package com.interview.backend.project.dto;

// 값이 담겨온 필드만 수정하고, null인 필드는 기존 값을 유지한다.
public record UpdateProjectRequest(
        String title,
        String description,
        String techStack,
        String role,
        String mainFeatures,
        String problemSolving
) {}
