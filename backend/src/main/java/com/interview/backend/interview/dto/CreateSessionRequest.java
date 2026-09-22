package com.interview.backend.interview.dto;

import com.interview.backend.interview.Difficulty;
import com.interview.backend.interview.InterviewMode;
import com.interview.backend.interview.JobRole;
import jakarta.validation.constraints.NotNull;

// jobRole/difficulty/questionCount/mode는 전부 선택값이다 - 안 보내면 세션에 NULL로 저장된다.
// 이번 단계에서는 저장만 하고, 질문 생성 프롬프트나 면접 종료 로직에는 아직 쓰지 않는다.
public record CreateSessionRequest(
        @NotNull Long projectId,
        JobRole jobRole,
        Difficulty difficulty,
        Integer questionCount,
        InterviewMode mode
) {}
