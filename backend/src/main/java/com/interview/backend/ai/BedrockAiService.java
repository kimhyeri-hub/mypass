package com.interview.backend.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseRequest;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.Message;

/**
 * {@link AiService}의 AWS Bedrock 구현체 (Converse API 사용).
 *
 * 자격증명 관련 로직은 이 클래스에 전혀 없다 - {@link BedrockConfig}가 만들어주는
 * {@link BedrockRuntimeClient}가 이미 Default Credentials Provider Chain으로
 * 구성되어 있고, 이 서비스는 그 클라이언트로 모델만 호출한다.
 *
 * app.ai.provider=bedrock 일 때만 활성화된다 (기본값은 OpenAiService).
 */
@Service
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "bedrock")
public class BedrockAiService implements AiService {

    private final BedrockRuntimeClient bedrockRuntimeClient;
    private final String modelId;

    // app.aws.bedrock.model-id는 일반 모델 ID뿐 아니라 학교 AWS 환경처럼
    // us. 접두사가 붙은 cross-region inference profile ID/ARN도 그대로 받는다 -
    // Converse API의 modelId 필드는 둘 다 그대로 문자열로 받아들인다.
    public BedrockAiService(
            BedrockRuntimeClient bedrockRuntimeClient,
            @Value("${app.aws.bedrock.model-id}") String modelId) {
        this.bedrockRuntimeClient = bedrockRuntimeClient;
        this.modelId = modelId;
    }

    @Override
    public String generateQuestion(String context) {
        Message message = Message.builder()
                .role(ConversationRole.USER)
                .content(ContentBlock.fromText(context))
                .build();

        ConverseRequest request = ConverseRequest.builder()
                .modelId(modelId)
                .messages(message)
                .build();

        ConverseResponse response = bedrockRuntimeClient.converse(request);
        return response.output().message().content().get(0).text();
    }
}
