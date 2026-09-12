package com.interview.backend.interview.dto;

import com.interview.backend.interview.InterviewSession;

import java.time.LocalDateTime;
import java.util.List;

public record SessionResponse(
        Long sessionId,
        Long projectId,
        String status,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        Float overallContentScore,
        Float overallDeliveryScore,
        String strengths,
        String weaknesses,
        String summaryText,
        List<QuestionResponse> questions
) {
    public static SessionResponse from(InterviewSession session, List<QuestionResponse> questions) {
        return new SessionResponse(
                session.getSessionId(),
                session.getProjectId(),
                session.getStatus(),
                session.getStartedAt(),
                session.getEndedAt(),
                session.getOverallContentScore(),
                session.getOverallDeliveryScore(),
                session.getStrengths(),
                session.getWeaknesses(),
                session.getSummaryText(),
                questions
        );
    }
}
