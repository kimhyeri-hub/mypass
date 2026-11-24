package com.interview.backend.interview.dto;

import java.util.List;

/** 결과지용 답변 보완 가이드. 모범답안 전체가 아니라 키워드와 짧은 보완 포인트만 담는다. */
public record AnswerCoachResponse(List<String> keywords, List<String> improvements) {
}
