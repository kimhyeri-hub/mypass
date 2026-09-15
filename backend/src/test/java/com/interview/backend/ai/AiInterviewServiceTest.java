package com.interview.backend.ai;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiInterviewServiceTest {

    @Mock
    private AiService aiService;

    @Test
    void generatesQuestionFromParsedText() {
        when(aiService.generateQuestion(contains("Spring Boot와 MariaDB로 만든 면접 서비스")))
                .thenReturn("Spring Boot를 선택한 이유는 무엇인가요?");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        String question = aiInterviewService.generateQuestion("Spring Boot와 MariaDB로 만든 면접 서비스");

        assertThat(question).isEqualTo("Spring Boot를 선택한 이유는 무엇인가요?");
    }

    @Test
    void rejectsWhenParsedTextIsBlank() {
        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.generateQuestion("  "))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsWhenParsedTextIsNull() {
        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.generateQuestion(null))
                .isInstanceOf(ResponseStatusException.class);
    }
}
