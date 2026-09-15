package com.interview.backend.user.dto;

// 이메일은 로그인 식별자라 여기서는 바꾸지 않고, 이름만 수정 가능하게 한다.
public record UpdateUserRequest(
        String name
) {}
