package com.interview.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.parameters.RequestBody;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.core.ResolvableType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

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

    /**
     * {@code @RequestParam MultipartFile / List<MultipartFile>}을 받는 엔드포인트의 문서를 바로잡는다.
     *
     * 컨트롤러에 consumes가 없으면 springdoc이 모든 {@code @RequestParam}을 query 파라미터로 그려서
     * Swagger UI가 파일을 query string에 넣으려다 "Value must be a string" 오류가 난다.
     * 그래서 이런 엔드포인트는 query 파라미터를 multipart/form-data 요청 본문으로 옮겨 적는다.
     * 문서(OpenAPI JSON)만 바뀌고 컨트롤러/서비스의 실제 동작은 그대로다.
     */
    @Bean
    public OperationCustomizer multipartRequestParamCustomizer() {
        return (operation, handlerMethod) -> {
            Map<String, Boolean> fileParams = findMultipartRequestParams(handlerMethod);
            if (fileParams.isEmpty() || operation.getRequestBody() != null || operation.getParameters() == null) {
                return operation;
            }
            moveQueryParamsToMultipartBody(operation, fileParams);
            return operation;
        };
    }

    // 파일 파라미터 이름 -> 필수 여부(@RequestParam의 required)
    private static Map<String, Boolean> findMultipartRequestParams(HandlerMethod handlerMethod) {
        Map<String, Boolean> fileParams = new HashMap<>();
        for (MethodParameter parameter : handlerMethod.getMethodParameters()) {
            RequestParam requestParam = parameter.getParameterAnnotation(RequestParam.class);
            if (requestParam != null && isMultipartType(parameter)) {
                String name = StringUtils.hasText(requestParam.name()) ? requestParam.name() : requestParam.value();
                if (!StringUtils.hasText(name)) {
                    name = parameter.getParameterName();
                }
                fileParams.put(name, requestParam.required());
            }
        }
        return fileParams;
    }

    private static boolean isMultipartType(MethodParameter parameter) {
        ResolvableType type = ResolvableType.forMethodParameter(parameter);
        Class<?> raw = type.resolve();
        if (raw == null) {
            return false;
        }
        if (MultipartFile.class.isAssignableFrom(raw)) {
            return true;
        }
        if (raw.isArray()) {
            return MultipartFile.class.isAssignableFrom(raw.getComponentType());
        }
        if (Collection.class.isAssignableFrom(raw)) {
            Class<?> element = type.asCollection().resolveGeneric(0);
            return element != null && MultipartFile.class.isAssignableFrom(element);
        }
        return false;
    }

    private static void moveQueryParamsToMultipartBody(Operation operation, Map<String, Boolean> fileParams) {
        ObjectSchema schema = new ObjectSchema();

        Iterator<Parameter> iterator = operation.getParameters().iterator();
        while (iterator.hasNext()) {
            Parameter parameter = iterator.next();
            if (!"query".equals(parameter.getIn())) {
                continue;
            }
            // 파일 파라미터의 required는 springdoc이 true로 잘못 표시하므로 @RequestParam 값을 따른다.
            boolean required = fileParams.containsKey(parameter.getName())
                    ? fileParams.get(parameter.getName())
                    : Boolean.TRUE.equals(parameter.getRequired());

            // 파일은 springdoc이 만든 array(binary) / binary 스키마를 그대로 쓴다.
            schema.addProperty(parameter.getName(), parameter.getSchema());
            if (required) {
                schema.addRequiredItem(parameter.getName());
            }
            iterator.remove();
        }

        if (operation.getParameters().isEmpty()) {
            operation.setParameters(null);
        }
        operation.setRequestBody(new RequestBody()
                .content(new Content().addMediaType(
                        org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE,
                        new MediaType().schema(schema))));
    }
}
