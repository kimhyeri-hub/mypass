package com.interview.backend.ai;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseOutput;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseRequest;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.Message;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BedrockAiServiceTest {

    @Mock
    private BedrockRuntimeClient bedrockRuntimeClient;

    @Test
    void generatesQuestionByCallingConverseWithConfiguredModelId() {
        ConverseResponse response = ConverseResponse.builder()
                .output(ConverseOutput.builder()
                        .message(Message.builder()
                                .role(ConversationRole.ASSISTANT)
                                .content(ContentBlock.fromText("Spring Boot를 선택한 이유는 무엇인가요?"))
                                .build())
                        .build())
                .build();

        ArgumentCaptor<ConverseRequest> requestCaptor = ArgumentCaptor.forClass(ConverseRequest.class);
        when(bedrockRuntimeClient.converse(requestCaptor.capture())).thenReturn(response);

        BedrockAiService bedrockAiService = new BedrockAiService(
                bedrockRuntimeClient, "anthropic.claude-3-haiku-20240307-v1:0");

        String question = bedrockAiService.generateQuestion("Spring Boot와 MariaDB로 만든 면접 서비스");

        assertThat(question).isEqualTo("Spring Boot를 선택한 이유는 무엇인가요?");
        assertThat(requestCaptor.getValue().modelId()).isEqualTo("anthropic.claude-3-haiku-20240307-v1:0");
        assertThat(requestCaptor.getValue().messages()).hasSize(1);
        assertThat(requestCaptor.getValue().messages().get(0).content().get(0).text())
                .isEqualTo("Spring Boot와 MariaDB로 만든 면접 서비스");
    }
}
