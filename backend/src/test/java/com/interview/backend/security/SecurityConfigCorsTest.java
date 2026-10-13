package com.interview.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

class SecurityConfigCorsTest {

    private CorsConfiguration corsFor(String allowedOrigins) {
        SecurityConfig config = new SecurityConfig(mock(JwtAuthFilter.class), allowedOrigins);
        return config.corsConfigurationSource().getCorsConfiguration(new MockHttpServletRequest("GET", "/api/sessions"));
    }

    @Test
    void 기본값이면_로컬_개발_서버만_허용한다() {
        CorsConfiguration cors = corsFor("http://localhost:5173");

        assertThat(cors.getAllowedOrigins()).containsExactly("http://localhost:5173");
        assertThat(cors.checkOrigin("http://localhost:5173")).isEqualTo("http://localhost:5173");
        assertThat(cors.checkOrigin("http://54.180.25.26")).isNull();
    }

    @Test
    void 쉼표로_구분한_여러_주소를_공백을_제거하고_허용한다() {
        CorsConfiguration cors = corsFor(" http://localhost:5173 , https://mypass.example.org ,");

        assertThat(cors.getAllowedOrigins()).containsExactly("http://localhost:5173", "https://mypass.example.org");
        assertThat(cors.checkOrigin("https://mypass.example.org")).isEqualTo("https://mypass.example.org");
        assertThat(cors.checkOrigin("http://mypass.example.org")).isNull();
    }

    @Test
    void 기존_메서드와_헤더_허용_범위는_그대로다() {
        CorsConfiguration cors = corsFor("http://localhost:5173");

        assertThat(cors.getAllowedMethods()).containsExactly("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertThat(cors.getAllowedHeaders()).containsExactly("*");
    }
}
