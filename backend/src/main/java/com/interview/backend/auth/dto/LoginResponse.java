package com.interview.backend.auth.dto;

public record LoginResponse(String accessToken, String email, String name) {}
