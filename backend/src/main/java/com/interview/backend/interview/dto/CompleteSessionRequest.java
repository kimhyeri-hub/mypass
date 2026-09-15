package com.interview.backend.interview.dto;

public record CompleteSessionRequest(
        Float overallContentScore,
        Float overallDeliveryScore,
        String strengths,
        String weaknesses,
        String summaryText
) {}
