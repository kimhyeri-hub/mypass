package com.interview.backend.interview.dto;

public record CreateAnswerRequest(
        String answerText,
        String audioUrl,
        String videoUrl,
        Integer durationSec
) {}
