package com.mypass.ai; // 실제 패키지 경로에 맞게 첫 줄은 수정될 수 있습니다.

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.springframework.stereotype.Service;

@Service
public class AiInterviewService {

    // OpenAI 모델 세팅 (발급받은 API 키를 여기에 넣어서 연결합니다)
    private final ChatLanguageModel chatModel = OpenAiChatModel.builder()
            .apiKey("API Key 작성
") // 임시 테스트용
            .modelName("gpt-4o-mini") // 저렴하고 빠른 최신 모델
            .build();

    /**
     * 지원자의 프로젝트 경험을 바탕으로 면접 질문을 생성하는 메서드
     */
    public String generateQuestion(String projectExperience) {
        // AI에게 내릴 프롬프트(명령어) 작성
        String prompt = "너는 IT 기업의 엄격한 기술 면접관이야. " +
                        "다음 지원자의 프로젝트 경험을 읽고, 실무 역량을 검증할 수 있는 날카로운 꼬리질문 1개를 만들어줘.\n\n" +
                        "프로젝트 경험: " + projectExperience;

        // OpenAI로 프롬프트를 전송하고 답변(생성된 질문)을 받아옴
        return chatModel.generate(prompt);
    }
}
