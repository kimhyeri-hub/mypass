package com.interview.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Swagger UI 상단에 Authorize 버튼을 띄우고, 로그인으로 받은 JWT를
// "Authorization: Bearer <token>" 헤더로 실어 보내게 한다.
// 문서용 설정일 뿐이라 SecurityConfig / JwtAuthFilter의 실제 인증 동작에는 영향이 없다.
@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        SecurityScheme bearerScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT");

        return new OpenAPI()
                .components(new Components().addSecuritySchemes(BEARER_AUTH, bearerScheme))
                // 전역 SecurityRequirement: 모든 API에 bearerAuth가 적용된 것으로 문서화된다.
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH));
    }
}
