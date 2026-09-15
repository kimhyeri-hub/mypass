package com.interview.backend.interview.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateQuestionRequest(
        Long parentQuestionId,
        Integer sequenceNo,
        @NotBlank String questionText,
        String questionType,
        String ttsAudioUrl
) {}
