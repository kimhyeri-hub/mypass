package com.interview.backend.ai;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// OpenAiService에서만 쓰는 langchain4j ChatModel 빈이라, Provider가 openai일 때만 만든다
// (app.ai.provider=bedrock이면 OpenAI 키 없이도 앱이 뜰 수 있어야 하므로).
@Configuration
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "openai", matchIfMissing = true)
public class AiConfig {

    @Bean
    public ChatModel chatModel(
            @Value("${app.openai.api-key:}") String apiKey,
            @Value("${app.openai.model:gpt-4o-mini}") String modelName) {
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .build();
    }
}
