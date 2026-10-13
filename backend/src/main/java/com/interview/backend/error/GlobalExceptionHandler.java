package com.interview.backend.error;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.util.StringUtils;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;

/**
 * 모든 컨트롤러 공통 오류 응답. server.error.include-message 없이도 사용자에게 필요한 안내 문구는 전달하고,
 * 예상하지 못한 예외의 내부 메시지(SQL, 외부 서버 주소, 키 등)와 스택 트레이스는 응답에 싣지 않고 서버 로그에만 남긴다.
 *
 * 응답 형식은 Spring 기본 오류 JSON과 같은 {timestamp, status, error, message, path}라서,
 * 프론트의 api/client.ts(parseErrorMessage: data.message 우선)가 그대로 동작한다.
 * AuthController/UserController 안의 @ExceptionHandler(로그인 실패 등)는 이 클래스보다 우선 적용되어 기존 응답을 유지한다.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    static final String INTERNAL_ERROR_MESSAGE = "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
    static final String BAD_REQUEST_MESSAGE = "요청 형식이 올바르지 않아요.";

    public record ErrorBody(OffsetDateTime timestamp, int status, String error, String message, String path) {}

    // 서비스에서 직접 던진 오류 - 상태 코드와 개발자가 작성한 한글 안내 문구(reason)를 그대로 전달한다.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorBody> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatusCode status = ex.getStatusCode();
        if (status.is5xxServerError()) {
            log.warn("{} {} -> {} {}", request.getMethod(), request.getRequestURI(), status.value(), ex.getReason());
        }
        String message = StringUtils.hasText(ex.getReason()) ? ex.getReason() : defaultMessage(status);
        return build(status, message, request);
    }

    // @Valid 검사 실패 - 어떤 필드가 문제인지만 알려주고 입력값 자체는 되돌려주지 않는다.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String fields = String.join(", ", ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField())
                .distinct()
                .toList());
        String message = fields.isEmpty() ? "입력값을 확인해 주세요." : "입력값을 확인해 주세요: " + fields;
        return build(HttpStatus.BAD_REQUEST, message, request);
    }

    // JSON 파싱 오류 등 - 파서의 내부 메시지 대신 일반 안내 문구를 준다.
    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ErrorBody> handleBadRequest(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, BAD_REQUEST_MESSAGE, request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorBody> handleMaxUploadSize(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, defaultMessage(HttpStatus.PAYLOAD_TOO_LARGE), request);
    }

    // 컨트롤러 안쪽에서 발생한 인증/인가 예외. (JWT 필터 단계의 401/403은 Spring Security가 따로 처리한다.)
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorBody> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, defaultMessage(HttpStatus.UNAUTHORIZED), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorBody> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, defaultMessage(HttpStatus.FORBIDDEN), request);
    }

    // 그 밖의 모든 예외. Spring MVC 표준 예외(404 경로 없음, 405 메서드 불일치 등)는 원래 상태 코드를 유지하고,
    // 나머지는 500으로 응답하되 원인은 로그에만 남긴다.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleUnexpected(Exception ex, HttpServletRequest request) {
        if (ex instanceof ErrorResponse errorResponse && !errorResponse.getStatusCode().is5xxServerError()) {
            HttpStatusCode status = errorResponse.getStatusCode();
            return build(status, defaultMessage(status), request);
        }
        log.error("Unhandled exception at {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_MESSAGE, request);
    }

    private ResponseEntity<ErrorBody> build(HttpStatusCode status, String message, HttpServletRequest request) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        String error = resolved != null ? resolved.getReasonPhrase() : String.valueOf(status.value());
        ErrorBody body = new ErrorBody(OffsetDateTime.now(), status.value(), error, message, request.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }

    static String defaultMessage(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> BAD_REQUEST_MESSAGE;
            case 401 -> "로그인이 필요해요.";
            case 403 -> "접근 권한이 없어요.";
            case 404 -> "요청한 정보를 찾을 수 없어요.";
            case 405 -> "지원하지 않는 요청이에요.";
            case 409 -> "지금은 요청을 처리할 수 없는 상태예요.";
            case 413 -> "업로드할 수 있는 파일 크기를 초과했어요.";
            default -> status.is5xxServerError() ? INTERNAL_ERROR_MESSAGE : "요청을 처리하지 못했어요.";
        };
    }
}
