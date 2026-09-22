package com.interview.backend.ai;

/** AI가 판단한 다음 질문의 종류. */
public enum NextQuestionType {
    /** 방금 답변한 내용을 더 파고드는 꼬리질문. 새 Question의 parentQuestionId = 현재 questionId. */
    FOLLOW_UP,
    /** 프로젝트 자료를 기반으로 한 새로운 주제의 질문. 새 Question의 parentQuestionId = null. */
    NEW_TOPIC
}
