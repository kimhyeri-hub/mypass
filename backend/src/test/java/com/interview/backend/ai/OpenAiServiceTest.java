package com.interview.backend.ai;

import dev.langchain4j.model.chat.ChatModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OpenAiServiceTest {

    @Mock
    private ChatModel chatModel;

    @Test
    void delegatesGenerateQuestionToChatModel() {
        when(chatModel.chat("some prompt")).thenReturn("generated question");

        AiService aiService = new OpenAiService(chatModel);

        assertThat(aiService.generateQuestion("some prompt")).isEqualTo("generated question");
    }
}
