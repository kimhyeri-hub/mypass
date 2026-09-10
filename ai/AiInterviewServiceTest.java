package com.mypass.ai; // 본인 패키지 경로에 맞게 첫 줄 확인

import org.junit.jupiter.api.Test;

public class AiInterviewServiceTest {

    @Test
    void AI_면접질문_생성_테스트() {
        // 1. 우리가 만든 AI 서비스 객체 생성
        AiInterviewService aiService = new AiInterviewService();

        // 2. 가상의 지원자 프로젝트 경험 데이터
        String mockProject = "React와 Spring Boot를 사용해 대규모 트래픽을 처리하는 티켓팅 웹 서비스를 개발했습니다. Redis를 이용해 동시성 문제를 해결했습니다.";

        System.out.println("====== [AI 면접관이 질문을 생각하는 중...] ======");

        // 3. AI에게 질문 생성 요청
        String question = aiService.generateQuestion(mockProject);

        // 4. 결과 출력
        System.out.println("\n[생성된 면접 질문]:\n" + question);
        System.out.println("\n================================================");
    }
}
