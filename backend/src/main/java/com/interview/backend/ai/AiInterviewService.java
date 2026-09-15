package com.interview.backend.ai;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiInterviewService {

    private final AiService aiService;

    public AiInterviewService(AiService aiService) {
        this.aiService = aiService;
    }

    public String generateQuestion(String parsedText) {
        if (parsedText == null || parsedText.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "질문을 생성할 프로젝트 자료가 없습니다. PDF를 먼저 업로드하세요.");
        }

        return aiService.generateQuestion(buildPrompt(parsedText));
    }

    private String buildPrompt(String parsedText) {
        return """
                다음은 사용자가 업로드한 프로젝트/전공 자료입니다.

                [자료]
                %s

                당신은 개발자 기술면접관입니다.
                자료를 기반으로 기술면접 질문 하나를 생성하세요.
                """.formatted(parsedText);
    }
}
