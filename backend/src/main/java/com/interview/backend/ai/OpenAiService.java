package com.interview.backend.ai;

import dev.langchain4j.model.chat.ChatModel;
import org.springframework.stereotype.Service;

/**
 * {@link AiService}의 OpenAI 구현체. 실제 모델 호출은 langchain4j의
 * {@link ChatModel}(AiConfig에서 OpenAI 키로 생성됨)에 위임한다.
 *
 * ---- Bedrock 구현체를 추가할 때 ----
 * 1. BedrockAiService implements AiService 를 이 패키지에 추가하고,
 *    생성자에서 Bedrock 전용 클라이언트(langchain4j-bedrock의 BedrockChatModel,
 *    또는 AWS SDK의 BedrockRuntimeClient)를 주입받아 generateQuestion에서 호출한다.
 * 2. AiService 구현체가 2개(OpenAiService, BedrockAiService)가 되므로
 *    스프링이 어떤 빈을 주입할지 정해줘야 한다 — 둘 중 하나에 @Primary를 붙이거나,
 *    application.properties의 app.ai.provider 같은 값으로
 *    @ConditionalOnProperty를 걸어 활성 Provider를 선택하는 방식을 권장한다.
 * 3. AiInterviewService / AiInterviewController는 AiService 인터페이스에만
 *    의존하므로 수정할 필요가 없다.
 */
@Service
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
