package com.interview.backend.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AiInterviewService {

    private final AiService aiService;
    // AI의 JSON 응답을 파싱하는 용도로만 쓴다. AiService 쪽은 항상 순수 텍스트(String)를 주고받으므로
    // Provider(OpenAI/Bedrock, LiteLLM Gateway 경유 여부와 무관)는 전혀 건드리지 않는다.
    private final ObjectMapper objectMapper = new ObjectMapper();

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

    /**
     * 방금 나온 질문과 지원자의 최종 답변을 근거로 다음 질문을 결정한다.
     * 답변을 더 파고들 필요가 있으면 꼬리질문(FOLLOW_UP), 아니면 프로젝트 자료 기반의
     * 새로운 주제 질문(NEW_TOPIC)을 AI가 스스로 고른다.
     *
     * askedQuestionTexts(이 세션에서 이미 나온 질문들)와 followUpDepth(현재 질문이 최초 질문으로부터
     * 몇 단계 이어진 꼬리질문인지)는 AI가 반복을 피하고 맥락을 파악하도록 참고 정보로만 전달한다.
     * 꼬리질문 최대 횟수 강제는 이 메서드를 호출하는 쪽(InterviewSessionService)에서
     * AI를 아예 호출하지 않는 방식으로 처리한다 - {@link #generateNewTopicQuestion} 참고.
     */
    public NextQuestionDecision decideNextQuestion(
            String projectContext,
            String currentQuestionText,
            String finalAnswerText,
            List<String> askedQuestionTexts,
            int followUpDepth
    ) {
        if (currentQuestionText == null || currentQuestionText.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "다음 질문을 판단할 기존 질문이 없습니다.");
        }
        if (finalAnswerText == null || finalAnswerText.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "분석할 답변 텍스트가 없습니다. 음성/영상 답변은 아직 지원하지 않습니다.");
        }

        String raw = aiService.generateQuestion(buildNextQuestionPrompt(
                projectContext, currentQuestionText, finalAnswerText, askedQuestionTexts, followUpDepth));
        return parseNextQuestionDecision(raw);
    }

    /**
     * 꼬리질문 최대 횟수에 도달해서 AI에게 FOLLOW_UP/NEW_TOPIC 판단 자체를 맡기지 않을 때 쓴다.
     * JSON이 아니라 질문 문장 하나만 응답받으므로 새로 정의한 판단 유형 파싱 실패 위험이 없다.
     * 어떤 주제를 고를지는 하드코딩하지 않고, 세션에서 이미 나온 질문 목록을 근거로 AI가 직접 고른다.
     */
    public String generateNewTopicQuestion(String projectContext, List<String> askedQuestionTexts) {
        if (projectContext == null || projectContext.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "질문을 생성할 프로젝트 자료가 없습니다. PDF를 먼저 업로드하세요.");
        }

        String raw = aiService.generateQuestion(buildForcedNewTopicPrompt(projectContext, askedQuestionTexts));
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해주세요.");
        }
        return raw.trim();
    }

    private String buildPrompt(String parsedText) {
        return """
                다음은 사용자가 업로드한 프로젝트/전공 자료입니다.

                [자료]
                %s

                당신은 개발자 기술면접관입니다.
                위 자료를 기반으로 기술면접 질문을 하나만 생성하세요.

                규칙:
                - 위 자료에 명시적으로 나온 기술, 경험, 역할만 질문의 근거로 사용하세요.
                - 자료에 없는 기술이나 경험을 사용했다고 가정하거나 임의로 지어내지 마세요.
                - 자료에 명확히 드러나지 않아 불확실한 내용은 사실로 전제하지 말고, 그런 내용을 근거로 질문하지 마세요.
                - 질문 문장 하나만 응답하세요. 질문 앞뒤에 설명, 안내 문구, 평가 기준, 예시 답변을 포함하지 마세요.
                - 번호, 제목, 따옴표, 마크다운 등 형식을 붙이지 말고, 실제 면접관이 말하듯 자연스러운 한 문장으로만 응답하세요.
                """.formatted(parsedText);
    }

    private String buildNextQuestionPrompt(
            String projectContext,
            String currentQuestionText,
            String finalAnswerText,
            List<String> askedQuestionTexts,
            int followUpDepth
    ) {
        return """
                당신은 개발자 기술면접관입니다. 아래 정보를 참고하여 다음에 할 질문을 결정하세요.

                [프로젝트 자료]
                %s

                [이 세션에서 지금까지 나온 질문 목록]
                %s

                [현재 질문]
                %s
                (참고: 이 질문은 최초 질문으로부터 %d단계 이어진 질문입니다. 0이면 최초 질문입니다.)

                [지원자의 답변]
                %s

                판단 기준:
                - 답변에서 기술적으로 더 확인할 부분이 있다면 "FOLLOW_UP"을 선택하고, 그 답변 내용을 파고드는 꼬리질문을 생성하세요.
                - 답변이 충분하거나 다른 주제로 넘어가는 것이 적절하다면 "NEW_TOPIC"을 선택하고, 위 [이 세션에서 지금까지 나온 질문 목록]과 겹치지 않는, 프로젝트 자료 안에서 아직 다루지 않은 다른 기술이나 경험을 기반으로 새로운 주제의 질문을 생성하세요.
                - 이미 이 세션에서 다룬 내용을 반복해서 질문하지 마세요.

                반드시 아래 JSON 형식으로만 응답하세요. 그 외의 설명, 인사말, 마크다운 코드블록은 포함하지 마세요.
                {"type": "FOLLOW_UP 또는 NEW_TOPIC", "question": "실제 면접 질문 한 개"}

                question 필드에는 지원자에게 실제로 물어볼 질문 문장 하나만 담으세요.
                평가 기준, 설명, 예시 답변 등 질문 이외의 내용은 포함하지 마세요.
                """.formatted(
                        contextOrPlaceholder(projectContext),
                        formatAskedQuestions(askedQuestionTexts),
                        currentQuestionText,
                        followUpDepth,
                        finalAnswerText);
    }

    private String buildForcedNewTopicPrompt(String projectContext, List<String> askedQuestionTexts) {
        return """
                당신은 개발자 기술면접관입니다.
                지원자가 이미 충분히 답변했으므로, 지금까지와는 다른 새로운 주제의 기술면접 질문을 하나 생성하세요.

                [프로젝트 자료]
                %s

                [이 세션에서 지금까지 나온 질문 목록 - 아래 내용과 겹치지 않는 주제를 선택하세요]
                %s

                프로젝트 자료 안에서 위 목록과 겹치지 않는, 아직 다루지 않은 다른 기술이나 구현 경험을 골라 질문을 하나 생성하세요.
                질문 문장 하나만 응답하세요. 설명, 평가 기준, 예시 답변, 인사말 등 다른 내용은 포함하지 마세요.
                """.formatted(contextOrPlaceholder(projectContext), formatAskedQuestions(askedQuestionTexts));
    }

    private String contextOrPlaceholder(String projectContext) {
        return (projectContext == null || projectContext.isBlank()) ? "(제공된 프로젝트 자료 없음)" : projectContext;
    }

    private String formatAskedQuestions(List<String> askedQuestionTexts) {
        if (askedQuestionTexts == null || askedQuestionTexts.isEmpty()) {
            return "(아직 없음)";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < askedQuestionTexts.size(); i++) {
            sb.append(i + 1).append(". ").append(askedQuestionTexts.get(i)).append('\n');
        }
        return sb.toString().trim();
    }

    private NextQuestionDecision parseNextQuestionDecision(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해주세요.");
        }

        RawDecision parsed;
        try {
            parsed = objectMapper.readValue(stripCodeFence(raw), RawDecision.class);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.");
        }

        if (parsed.type() == null || parsed.type().isBlank()
                || parsed.question() == null || parsed.question().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 응답 형식이 올바르지 않습니다.");
        }

        NextQuestionType type;
        try {
            type = NextQuestionType.valueOf(parsed.type().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "AI가 알 수 없는 판단 유형을 반환했습니다: " + parsed.type());
        }

        return new NextQuestionDecision(type, parsed.question().trim());
    }

    // 일부 모델이 JSON을 ```json ... ``` 코드블록으로 감싸서 응답하는 경우를 대비한 방어 처리.
    private String stripCodeFence(String raw) {
        String trimmed = raw.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }
        int firstNewline = trimmed.indexOf('\n');
        int lastFence = trimmed.lastIndexOf("```");
        if (firstNewline == -1 || lastFence <= firstNewline) {
            return trimmed;
        }
        return trimmed.substring(firstNewline + 1, lastFence).trim();
    }

    private record RawDecision(String type, String question) {}
}
