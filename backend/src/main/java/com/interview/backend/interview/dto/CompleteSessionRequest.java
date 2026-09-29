package com.interview.backend.interview.dto;

public record CompleteSessionRequest(
        Float overallContentScore,
        Float overallDeliveryScore,
        Float logicScore,
        Float specificityScore,
        String strengths,
        String weaknesses,
        String summaryText
) {}
