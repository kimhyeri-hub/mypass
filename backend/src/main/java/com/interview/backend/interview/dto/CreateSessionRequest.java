package com.interview.backend.interview.dto;

import jakarta.validation.constraints.NotNull;

public record CreateSessionRequest(
        @NotNull Long projectId
) {}
