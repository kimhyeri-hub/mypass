package com.interview.backend.interview.dto;

import com.interview.backend.interview.Question;

import java.time.LocalDateTime;
import java.util.List;

public record QuestionResponse(
        Long questionId,
        Long parentQuestionId,
        Integer sequenceNo,
        String questionText,
        String questionType,
        String ttsAudioUrl,
        LocalDateTime createdAt,
        List<AnswerResponse> answers
) {
    public static QuestionResponse from(Question question, List<AnswerResponse> answers) {
        return new QuestionResponse(
                question.getQuestionId(),
                question.getParentQuestionId(),
                question.getSequenceNo(),
                question.getQuestionText(),
                question.getQuestionType(),
                question.getTtsAudioUrl(),
                question.getCreatedAt(),
                answers
        );
    }
}
