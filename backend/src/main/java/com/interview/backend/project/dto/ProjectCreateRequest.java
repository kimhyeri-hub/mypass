package com.interview.backend.project.dto;

import jakarta.validation.constraints.NotBlank;

public record ProjectCreateRequest(
        @NotBlank String title,
        String jobPosition
) {
}
