package com.interview.backend.ai;

/** {@link AiInterviewService#decideNextQuestion}이 반환하는, AI가 결정한 다음 질문. */
public record NextQuestionDecision(NextQuestionType type, String question) {}
