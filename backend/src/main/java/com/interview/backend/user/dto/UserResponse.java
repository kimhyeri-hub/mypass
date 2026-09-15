package com.interview.backend.user.dto;

import com.interview.backend.user.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long userId,
        String email,
        String name,
        String provider,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getUserId(),
                user.getEmail(),
                user.getName(),
                user.getProvider(),
                user.getCreatedAt()
        );
    }
}
