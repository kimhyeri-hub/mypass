package com.interview.backend.ai;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// OpenAiService에서만 쓰는 langchain4j ChatModel 빈이라, Provider가 openai일 때만 만든다
// (app.ai.provider=bedrock이면 게이트웨이 설정 없이도 앱이 뜰 수 있어야 하므로).
//
// base-url을 LiteLLM Gateway(OpenAI 호환)로 지정하면 Bedrock 모델도 이 빈으로 호출된다.
// langchain4j가 base-url 뒤에 "chat/completions"를 붙이므로 LLM_BASE_URL은 "/v1"까지 포함해야 한다
// (예: https://<gateway-host>/v1). 키/주소는 환경변수(LLM_API_KEY, LLM_BASE_URL)로만 주입한다.
@Configuration
@ConditionalOnProperty(
        name = "app.ai.provider",
        havingValue = "openai",
        matchIfMissing = true
)
public class AiConfig {

    @Bean
    public ChatModel chatModel(
            @Value("${app.openai.base-url}") String baseUrl,
            @Value("${app.openai.api-key}") String apiKey,
            @Value("${app.openai.model:bedrock-sonnet}") String modelName
    ) {
        return OpenAiChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(modelName)
                .build();
    }
}
