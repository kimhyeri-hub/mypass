package com.interview.backend.error;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.interview.backend.auth.AuthController;
import com.interview.backend.auth.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

class GlobalExceptionHandlerTest {

    // 내부 예외 메시지에 섞여 들어갈 수 있는 민감 정보 예시 - 응답에 하나도 나오면 안 된다.
    private static final String SENSITIVE_DETAIL =
            "Connection refused: https://llm-gateway.internal.example/v1 api-key=sk-test-1234567890abcdef "
                    + "jdbc:mysql://10.0.0.5:3306/interview_db password=db-secret-pw";

    record SampleRequest(@NotBlank String name) {}

    @RestController
    static class SampleController {
        @GetMapping("/api/sample/pdf-missing")
        void pdfMissing() {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "질문을 생성할 프로젝트 자료가 없습니다. PDF를 먼저 업로드하세요.");
        }

        @GetMapping("/api/sample/in-progress")
        void inProgress() {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "아직 진행 중인 면접입니다. 완료 후 결과를 조회해주세요.");
        }

        @GetMapping("/api/sample/ai-failure")
        void aiFailure() {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.");
        }

        @GetMapping("/api/sample/no-reason")
        void noReason() {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        @GetMapping("/api/sample/unexpected")
        void unexpected() {
            throw new IllegalStateException(SENSITIVE_DETAIL, new RuntimeException(SENSITIVE_DETAIL));
        }

        @GetMapping("/api/sample/upload")
        void upload() {
            throw new MaxUploadSizeExceededException(20L * 1024 * 1024);
        }

        @GetMapping("/api/sample/auth")
        void auth() {
            throw new BadCredentialsException(SENSITIVE_DETAIL);
        }

        @GetMapping("/api/sample/items/{id}")
        void item(@PathVariable Long id) {
        }

        @PostMapping("/api/sample/valid")
        void valid(@Valid @RequestBody SampleRequest request) {
        }
    }

    private AuthService authService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        // Spring Boot 앱과 같은 UTF-8 문자열/JSON 변환기를 써야 AuthController의 한글 text 응답을 그대로 비교할 수 있다.
        mockMvc = MockMvcBuilders.standaloneSetup(new SampleController(), new AuthController(authService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(
                        new StringHttpMessageConverter(StandardCharsets.UTF_8),
                        new MappingJackson2HttpMessageConverter(Jackson2ObjectMapperBuilder.json().build()))
                .build();
    }

    @Test
    void ResponseStatusException은_상태코드와_한글_안내문구를_그대로_전달한다() throws Exception {
        mockMvc.perform(get("/api/sample/pdf-missing"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("질문을 생성할 프로젝트 자료가 없습니다. PDF를 먼저 업로드하세요."))
                .andExpect(jsonPath("$.path").value("/api/sample/pdf-missing"))
                .andExpect(jsonPath("$.timestamp").exists());

        mockMvc.perform(get("/api/sample/in-progress"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("아직 진행 중인 면접입니다. 완료 후 결과를 조회해주세요."));

        mockMvc.perform(get("/api/sample/ai-failure"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요."));
    }

    @Test
    void 안내문구가_없는_ResponseStatusException은_상태별_기본문구를_준다() throws Exception {
        mockMvc.perform(get("/api/sample/no-reason"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("요청한 정보를 찾을 수 없어요."));
    }

    @Test
    void 처리되지_않은_예외는_500과_일반문구만_반환하고_내부정보를_노출하지_않는다() throws Exception {
        mockMvc.perform(get("/api/sample/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.INTERNAL_ERROR_MESSAGE))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(content().string(not(containsString("llm-gateway"))))
                .andExpect(content().string(not(containsString("sk-test"))))
                .andExpect(content().string(not(containsString("jdbc:"))))
                .andExpect(content().string(not(containsString("db-secret-pw"))))
                .andExpect(content().string(not(containsString("IllegalStateException"))));
    }

    @Test
    void 잘못된_JSON은_파서_내부메시지_없이_400을_반환한다() throws Exception {
        mockMvc.perform(post("/api/sample/valid").contentType(MediaType.APPLICATION_JSON).content("{bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.BAD_REQUEST_MESSAGE))
                .andExpect(content().string(not(containsString("JSON parse error"))));
    }

    @Test
    void 경로변수_타입이_틀리면_400을_반환한다() throws Exception {
        mockMvc.perform(get("/api/sample/items/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.BAD_REQUEST_MESSAGE));
    }

    @Test
    void 유효성검사_실패는_필드명만_알려준다() throws Exception {
        mockMvc.perform(post("/api/sample/valid").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("입력값을 확인해 주세요: name"));
    }

    @Test
    void 업로드_용량_초과는_413을_반환한다() throws Exception {
        mockMvc.perform(get("/api/sample/upload"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message").value("업로드할 수 있는 파일 크기를 초과했어요."));
    }

    @Test
    void 컨트롤러_밖에서_처리되지_않은_인증예외는_401과_일반문구를_준다() throws Exception {
        mockMvc.perform(get("/api/sample/auth"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("로그인이 필요해요."))
                .andExpect(content().string(not(containsString("sk-test"))));
    }

    @Test
    void 로그인_실패는_AuthController의_기존_응답을_유지한다() throws Exception {
        when(authService.login(any())).thenThrow(new BadCredentialsException("이메일 또는 비밀번호가 올바르지 않습니다."));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("이메일 또는 비밀번호가 올바르지 않습니다."));
    }

    @Test
    void 로그인_유효성검사는_AuthController의_기존_응답을_유지한다() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("email: ")));
    }
}
