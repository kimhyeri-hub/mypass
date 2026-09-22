package com.interview.backend.interview;

/**
 * 면접 세션의 진행 모드. 지금은 연습(PRACTICE) 모드만 있지만,
 * 값이 하나뿐이어도 자유 문자열 대신 enum으로 둬서 다른 설정값(jobRole, difficulty)과
 * 동일하게 취급하고 이후 모드가 늘어날 때(REAL 등) 값을 추가하기만 하면 되게 한다.
 */
public enum InterviewMode {
    PRACTICE
}
