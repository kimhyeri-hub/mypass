package com.interview.backend.ai;

import dev.langchain4j.model.chat.ChatModel;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * {@link AiService}의 OpenAI 구현체. 실제 모델 호출은 langchain4j의
 * {@link ChatModel}(AiConfig에서 OpenAI 키로 생성됨)에 위임한다.
 *
 * app.ai.provider=openai 일 때(또는 값을 아예 안 줬을 때 기본값으로) 활성화된다.
 * Bedrock으로 전환하려면 app.ai.provider=bedrock — {@link BedrockAiService} 참고.
 */
@Service
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "openai", matchIfMissing = true)
public class OpenAiService implements AiService {

    private final ChatModel chatModel;

    public OpenAiService(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    @Override
    public String generateQuestion(String context) {
        return chatModel.chat(context);
    }
}
