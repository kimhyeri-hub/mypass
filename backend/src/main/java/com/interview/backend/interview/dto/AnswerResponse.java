package com.interview.backend.interview.dto;

import com.interview.backend.interview.Answer;

import java.time.LocalDateTime;

public record AnswerResponse(
        Long answerId,
        Integer attemptNo,
        Boolean isFinal,
        String answerText,
        String audioUrl,
        String videoUrl,
        Integer durationSec,
        Float gazeStabilityScore,
        Float voiceTremorScore,
        Float speakingRateWpm,
        Integer fillerWordCount,
        Float relevanceScore,
        Float clarityScore,
        String feedbackText,
        LocalDateTime answeredAt
) {
    public static AnswerResponse from(Answer answer) {
        return new AnswerResponse(
                answer.getAnswerId(),
                answer.getAttemptNo(),
                answer.getIsFinal(),
                answer.getAnswerText(),
                answer.getAudioUrl(),
                answer.getVideoUrl(),
                answer.getDurationSec(),
                answer.getGazeStabilityScore(),
                answer.getVoiceTremorScore(),
                answer.getSpeakingRateWpm(),
                answer.getFillerWordCount(),
                answer.getRelevanceScore(),
                answer.getClarityScore(),
                answer.getFeedbackText(),
                answer.getAnsweredAt()
        );
    }
}
