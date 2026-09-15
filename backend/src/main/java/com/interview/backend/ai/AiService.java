package com.interview.backend.ai;

/**
 * AI Provider 추상화 인터페이스.
 *
 * 현재는 {@link OpenAiService}만 구현체로 존재합니다.
 * 추후 AWS Bedrock 권한이 발급되면 이 인터페이스를 구현하는
 * BedrockAiService를 추가해서 Provider를 교체할 수 있습니다.
 * (교체 시 필요한 작업은 OpenAiService 클래스 상단 주석 참고)
 */
public interface AiService {

    /**
     * 주어진 컨텍스트(프롬프트)를 기반으로 면접 질문 하나를 생성한다.
     * 프롬프트 조립 등 비즈니스 로직은 호출하는 쪽(AiInterviewService)에서 처리하고,
     * 구현체는 실제 모델 호출만 담당한다.
     */
    String generateQuestion(String context);
}
