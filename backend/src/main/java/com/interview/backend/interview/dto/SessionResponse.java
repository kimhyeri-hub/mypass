package com.interview.backend.interview.dto;

import com.interview.backend.interview.Difficulty;
import com.interview.backend.interview.InterviewMode;
import com.interview.backend.interview.InterviewSession;
import com.interview.backend.interview.JobRole;

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
        JobRole jobRole,
        Difficulty difficulty,
        Integer questionCount,
        InterviewMode mode,
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
                session.getJobRole(),
                session.getDifficulty(),
                session.getQuestionCount(),
                session.getMode(),
                questions
        );
    }
}
