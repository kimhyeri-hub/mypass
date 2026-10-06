package com.interview.backend.ai;

/**
 * {@link AiInterviewService#evaluateSession}이 반환하는, 면접 세션 전체에 대한 AI 최종 평가.
 * 필드 구성은 기존 결과 저장 구조(CompleteSessionRequest)와 같고, 점수는 항상 0~100 범위다.
 */
public record SessionEvaluation(
        float overallContentScore,
        float overallDeliveryScore,
        float logicScore,
        float specificityScore,
        String strengths,
        String weaknesses,
        String summaryText
) {}
