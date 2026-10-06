package com.interview.backend.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.interview.backend.interview.Difficulty;
import com.interview.backend.interview.JobRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
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

    public String generateQuestion(String parsedText, JobRole jobRole, Difficulty difficulty) {
        if (parsedText == null || parsedText.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "질문을 생성할 프로젝트 자료가 없습니다. PDF를 먼저 업로드하세요.");
        }

        return aiService.generateQuestion(buildPrompt(parsedText, jobRole, difficulty));
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
     *
     * jobRole/difficulty는 세션 설정값으로, 질문의 관점(어느 영역을 우선할지)과 깊이(설명 수준인지
     * 심화 수준인지)만 조절한다 - 둘 다 자료/답변에 없는 사실을 만들어내는 근거로는 쓰지 않는다.
     */
    public NextQuestionDecision decideNextQuestion(
            String projectContext,
            String currentQuestionText,
            String finalAnswerText,
            List<String> askedQuestionTexts,
            int followUpDepth,
            JobRole jobRole,
            Difficulty difficulty
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
                projectContext, currentQuestionText, finalAnswerText, askedQuestionTexts, followUpDepth,
                jobRole, difficulty));
        return parseNextQuestionDecision(raw);
    }

    /**
     * 꼬리질문 최대 횟수에 도달해서 AI에게 FOLLOW_UP/NEW_TOPIC 판단 자체를 맡기지 않을 때 쓴다.
     * JSON이 아니라 질문 문장 하나만 응답받으므로 새로 정의한 판단 유형 파싱 실패 위험이 없다.
     * 어떤 주제를 고를지는 하드코딩하지 않고, 세션에서 이미 나온 질문 목록을 근거로 AI가 직접 고른다.
     */
    public String generateNewTopicQuestion(
            String projectContext, List<String> askedQuestionTexts, JobRole jobRole, Difficulty difficulty
    ) {
        if (projectContext == null || projectContext.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "질문을 생성할 프로젝트 자료가 없습니다. PDF를 먼저 업로드하세요.");
        }

        String raw = aiService.generateQuestion(
                buildForcedNewTopicPrompt(projectContext, askedQuestionTexts, jobRole, difficulty));
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해주세요.");
        }
        return raw.trim();
    }

    /**
     * 면접 세션에서 실제로 나온 질문과 최종 답변 전체를 근거로 AI 최종 평가를 생성한다.
     * 답변이 없는 질문도 "(답변 없음)"으로 함께 넘겨서 부족한 점으로 평가되게 한다.
     *
     * projectContext는 답변 내용의 사실관계를 확인하는 보조 근거로만 쓰고, 자료에만 있고
     * 답변에서 언급하지 않은 내용은 점수에 반영하지 않도록 프롬프트에서 막는다.
     */
    public SessionEvaluation evaluateSession(String projectContext, List<EvaluationItem> items) {
        if (items == null || items.stream().noneMatch(EvaluationItem::hasAnswer)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "평가할 최종 답변이 없습니다.");
        }

        String raw = aiService.generateQuestion(buildEvaluationPrompt(projectContext, items));
        return parseSessionEvaluation(raw);
    }

    private String buildPrompt(String parsedText, JobRole jobRole, Difficulty difficulty) {
        return """
                다음은 사용자가 업로드한 프로젝트/전공 자료입니다.

                [자료]
                %s

                [면접 설정]
                %s

                당신은 개발자 기술면접관입니다.
                위 자료를 기반으로 기술면접 질문을 하나만 생성하세요.

                규칙:
                - 위 자료에 명시적으로 나온 기술, 경험, 역할만 질문의 근거로 사용하세요.
                - 자료에 없는 기술이나 경험을 사용했다고 가정하거나 임의로 지어내지 마세요.
                - 자료에 명확히 드러나지 않아 불확실한 내용은 사실로 전제하지 말고, 그런 내용을 근거로 질문하지 마세요.
                - [면접 설정]의 직무 관점은 자료 안에서 어떤 부분을 우선 질문할지 고르는 용도로만 쓰세요. 해당 직무와 관련된 기술이 자료에 없다면 새로 지어내지 말고 자료에 실제로 있는 다른 내용으로 질문하세요.
                - [면접 설정]의 난이도는 질문의 깊이만 조절하세요. 난이도가 높다고 해서 자료에 없는 고급 기술을 새로 추가해서는 안 됩니다.
                - 질문 문장 하나만 응답하세요. 질문 앞뒤에 설명, 안내 문구, 평가 기준, 예시 답변을 포함하지 마세요.
                - 번호, 제목, 따옴표, 마크다운 등 형식을 붙이지 말고, 실제 면접관이 말하듯 자연스러운 한 문장으로만 응답하세요.

                %s
                """.formatted(parsedText, buildInterviewSettingsBlock(jobRole, difficulty), buildSourcePriorityRules(true));
    }

    private String buildNextQuestionPrompt(
            String projectContext,
            String currentQuestionText,
            String finalAnswerText,
            List<String> askedQuestionTexts,
            int followUpDepth,
            JobRole jobRole,
            Difficulty difficulty
    ) {
        return """
                당신은 개발자 기술면접관입니다. 아래 정보를 참고하여 다음에 할 질문을 결정하세요.

                [프로젝트 자료]
                %s

                [면접 설정]
                %s

                [이 세션에서 지금까지 나온 질문 목록]
                %s

                [현재 질문]
                %s
                (참고: 이 질문은 최초 질문으로부터 %d단계 이어진 질문입니다. 0이면 최초 질문입니다.)

                [지원자의 답변]
                %s

                공통 규칙:
                - [프로젝트 자료]와 [지원자의 답변]에 실제로 나온 내용만 사실로 인정하세요. 거기 없는 기술, 라이브러리, 구현 방식을 지원자가 사용했다고 가정하거나 임의로 지어내지 마세요.
                - 근거가 불확실한 내용은 사실로 전제하지 말고, 그런 내용을 근거로 질문하지 마세요.
                - [면접 설정]의 직무 관점은 자료 안에서 어떤 부분을 우선 질문할지 고르는 용도로만 쓰세요. 해당 직무와 관련된 기술이 자료에 없다면 새로 지어내지 말고 자료에 실제로 있는 다른 내용으로 질문하세요.
                - [면접 설정]의 난이도는 질문의 깊이만 조절하세요. 난이도가 높다고 해서 자료나 답변에 없는 고급 기술을 새로 추가해서는 안 됩니다.

                %s

                판단 기준:
                - 답변에서 기술적으로 더 확인할 부분이 있다면 "FOLLOW_UP"을 선택하세요. 질문은 반드시 [현재 질문]과 [지원자의 답변]에 실제로 나온 내용에서 근거를 찾아 만들고, 답변에서 언급하지 않은 구체적인 기술이나 구현 방식을 지원자가 사용했다고 가정해서 질문하지 마세요.
                - 답변이 충분하거나 다른 주제로 넘어가는 것이 적절하다면 "NEW_TOPIC"을 선택하세요. 질문은 반드시 [프로젝트 자료]에 실제로 등장하는, 위 [이 세션에서 지금까지 나온 질문 목록]과 겹치지 않는 다른 기술이나 경험만 근거로 삼으세요.
                - [이 세션에서 지금까지 나온 질문 목록]과 동일하거나, 표현만 다를 뿐 사실상 같은 질문을 다시 하지 마세요.
                - 답변이나 프로젝트 자료만으로는 근거 있는 FOLLOW_UP 질문을 만들기 어렵다면, 없는 사실을 지어내지 말고 "NEW_TOPIC"을 선택해서 프로젝트 자료 안에서 확인 가능한 다른 주제로 넘어가세요.

                반드시 아래 JSON 형식으로만 응답하세요. 그 외의 설명, 인사말, 마크다운 코드블록은 포함하지 마세요.
                {"type": "FOLLOW_UP 또는 NEW_TOPIC", "question": "실제 면접 질문 한 개"}

                question 필드에는 지원자에게 실제로 물어볼 질문 문장 하나만 담으세요.
                평가 기준, 설명, 예시 답변 등 질문 이외의 내용은 포함하지 마세요.
                """.formatted(
                        contextOrPlaceholder(projectContext),
                        buildInterviewSettingsBlock(jobRole, difficulty),
                        formatAskedQuestions(askedQuestionTexts),
                        currentQuestionText,
                        followUpDepth,
                        finalAnswerText,
                        buildSourcePriorityRules(true));
    }

    private String buildForcedNewTopicPrompt(
            String projectContext, List<String> askedQuestionTexts, JobRole jobRole, Difficulty difficulty
    ) {
        return """
                당신은 개발자 기술면접관입니다.
                지원자가 이미 충분히 답변했으므로, 지금까지와는 다른 새로운 주제의 기술면접 질문을 하나 생성하세요.

                [프로젝트 자료]
                %s

                [면접 설정]
                %s

                [이 세션에서 지금까지 나온 질문 목록 - 아래 내용과 겹치지 않는 주제를 선택하세요]
                %s

                규칙:
                - [프로젝트 자료]에 실제로 등장하는 기술이나 경험만 질문의 근거로 사용하세요. 자료에 없는 기술이나 경험을 지어내지 마세요.
                - 위 질문 목록과 동일하거나, 표현만 다를 뿐 사실상 같은 질문은 피하세요.
                - 자료만으로 완전히 새로운 주제를 찾기 어렵다면, 없는 사실을 만들어내지 말고 자료 안에서 아직 깊이 다루지 않은 부분을 찾아 질문하세요.
                - [면접 설정]의 직무 관점은 자료 안에서 어떤 부분을 우선 질문할지 고르는 용도로만 쓰세요. 해당 직무와 관련된 기술이 자료에 없다면 새로 지어내지 말고 자료에 실제로 있는 다른 내용으로 질문하세요.
                - [면접 설정]의 난이도는 질문의 깊이만 조절하세요. 난이도가 높다고 해서 자료에 없는 고급 기술을 새로 추가해서는 안 됩니다.

                %s

                프로젝트 자료 안에서 위 목록과 겹치지 않는, 아직 다루지 않은 다른 기술이나 구현 경험을 골라 질문을 하나 생성하세요.
                질문 문장 하나만 응답하세요. 설명, 평가 기준, 예시 답변, 인사말 등 다른 내용은 포함하지 마세요.
                """.formatted(
                        contextOrPlaceholder(projectContext),
                        buildInterviewSettingsBlock(jobRole, difficulty),
                        formatAskedQuestions(askedQuestionTexts),
                        buildSourcePriorityRules(true));
    }

    private String buildEvaluationPrompt(String projectContext, List<EvaluationItem> items) {
        return """
                당신은 개발자 기술면접 평가관입니다. 아래 면접 기록을 바탕으로 지원자의 면접 전체를 평가하세요.

                [프로젝트 자료 - 답변의 사실관계를 확인하기 위한 보조 근거]
                %s

                [면접 기록 - 실제 질문과 지원자의 최종 답변]
                %s

                평가 항목 (각 0~100점, 정수):
                - overallContentScore: 질문 의도에 적절하게 답변했는지, 프로젝트와 본인의 역할에 대한 이해가 드러나는지
                - overallDeliveryScore: 답변 텍스트 기준으로 핵심 내용이 명확하고 이해하기 쉽게 전달되는지
                - logicScore: 답변의 주장, 이유, 결과가 논리적으로 연결되는지, 기술 선택이나 문제 해결 과정에 근거가 있는지
                - specificityScore: 추상적인 답변이 아니라 실제 구현 내용, 본인의 역할, 문제 상황, 해결 과정 등을 구체적으로 설명했는지

                근거 규칙 (반드시 지키세요):
                - [면접 기록]의 실제 질문과 실제 최종 답변에서 확인할 수 있는 내용만 평가하세요.
                - [프로젝트 자료]는 답변 내용이 사실과 맞는지 확인하는 보조 근거로만 사용하세요.
                - [프로젝트 자료]에 있지만 지원자가 답변에서 언급하지 않은 내용을 지원자가 알고 있다고 판단해서 점수를 올리지 마세요.
                - 지원자가 말하지 않은 기술, 경험, 역할을 추측하거나 지원자가 특정 기술을 사용했다고 가정하지 마세요.
                - 부족한 답변을 임의로 보완하거나 해석해서 좋게 평가하지 말고, 부족한 점으로 평가하세요.
                - "(답변 없음)"인 질문은 답변하지 못한 것으로 보고, 그 내용을 알고 있다고 가정하지 마세요.
                - strengths와 weaknesses는 실제 답변에서 확인 가능한 근거(어떤 질문에 어떻게 답했는지)를 바탕으로 작성하세요.

                질문 전제 검증 규칙:
                - [면접 기록]의 질문은 AI가 생성한 것이라 근거 없는 전제가 포함되어 있을 수 있습니다.
                - 질문에 포함된 기술명, 프레임워크, 구현 방식, 역할 등의 전제를 무조건 사실이라고 가정하지 마세요.
                - 질문의 전제가 [프로젝트 자료] 또는 지원자의 답변에서 확인되지 않는다면, 그 전제에 답하지 못했다는 이유로 감점하지 마세요.
                - [프로젝트 자료]와 질문의 내용이 충돌하면 [프로젝트 자료]를 우선 근거로 사용하세요.
                - 근거 없는 질문 전제 때문에 지원자에게 불이익을 주지 마세요.
                - strengths, weaknesses, summaryText에서도 확인되지 않은 질문 전제를 사실처럼 반복하지 마세요.
                - 예: 질문이 "FastAPI를 사용했다"고 전제했더라도 [프로젝트 자료]와 답변에서 FastAPI 사용이 확인되지 않는다면, "FastAPI에 대해 답하지 못했다"는 이유로 감점하거나 weaknesses에 쓰지 마세요.

                %s

                자기소개 질문 규칙:
                - [자기소개]로 표시된 질문은 기술 질문이 아니라 자기소개입니다.
                - 자기소개 답변에 기술적 세부사항이 부족하다는 이유만으로 specificityScore나 다른 점수를 감점하지 마세요.
                - 자기소개 답변은 본인 소개와 역할, 지원 동기를 명확하게 전달했는지를 중심으로만 참고하세요.

                전달력(overallDeliveryScore) 규칙:
                - 지금은 실제 음성을 분석하지 않고 답변 텍스트만 받습니다. 텍스트로 전달된 내용의 명확성만 평가하세요.
                - 발음, 말하기 속도, 목소리 떨림, 억양 등 음성 특성은 평가하지 마세요.

                반드시 아래 JSON 형식으로만 응답하세요. 그 외의 설명, 인사말, 마크다운 코드블록은 포함하지 마세요.
                {"overallContentScore": 0, "overallDeliveryScore": 0, "logicScore": 0, "specificityScore": 0, "strengths": "...", "weaknesses": "...", "summaryText": "..."}

                strengths, weaknesses, summaryText는 모두 한국어 문장으로 작성하세요.
                """.formatted(contextOrPlaceholder(projectContext), formatEvaluationItems(items), buildSourcePriorityRules(false));
    }

    /**
     * 질문 생성/다음 질문/새 주제/평가 프롬프트에 공통으로 넣는 프로젝트 자료 우선순위 규칙.
     * 프로젝트 컨텍스트는 [프로젝트 메타데이터 - 우선 근거]와 [업로드 문서 - 보조 근거]로 나뉘어 들어온다.
     * forQuestion이면 확인형 질문 규칙을, 아니면(평가) 다른 팀원 담당 기능 감점 금지 규칙을 덧붙인다.
     */
    private String buildSourcePriorityRules(boolean forQuestion) {
        String common = """
                프로젝트 자료 우선순위 규칙:
                - [프로젝트 메타데이터]는 지원자가 직접 입력한 현재 프로젝트 정보입니다.
                - [업로드 문서]는 세부 구현 경험을 파악하기 위한 보조 자료이며, 작성 시점이 과거일 수 있습니다.
                - [프로젝트 메타데이터]와 [업로드 문서]의 내용이 충돌하면 [프로젝트 메타데이터]를 우선하세요.
                - [프로젝트 메타데이터]에 기술 스택이 있으면, [업로드 문서]에만 나오는 다른 기술을 현재 사용 기술이라고 단정하지 마세요.
                - 프로젝트 전체에서 쓴 기술·기능과 지원자의 담당 역할을 구분하세요.
                - [업로드 문서]에 다른 팀원의 담당으로 적힌 기능을 지원자가 직접 구현했다고 단정하지 마세요.""";
        if (forQuestion) {
            return common + """

                    - 근거가 불분명하거나 자료가 충돌하면 단정형 질문 대신 확인형 질문을 사용하세요.
                      예: 문서와 현재 기술 스택이 다르면 "FastAPI를 선택하셨는데..."처럼 FastAPI 사용을 현재 사실로 전제하지 마세요.
                      예: 다른 팀원의 담당 기능이면 "동적 스케줄링 알고리즘을 구현하셨는데..."처럼 지원자가 직접 구현했다고 전제하지 마세요.""";
        }
        return common + """

                - 다른 팀원의 담당 기능에 대해 지원자가 구현 세부사항을 설명하지 못했다는 이유로 감점하지 마세요.""";
    }

    private String formatEvaluationItems(List<EvaluationItem> items) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size(); i++) {
            EvaluationItem item = items.get(i);
            sb.append(i + 1).append(". [").append(item.label()).append("] ").append(item.questionText()).append('\n');
            sb.append("   답변: ").append(item.hasAnswer() ? item.finalAnswerText() : "(답변 없음)").append("\n\n");
        }
        return sb.toString().trim();
    }

    private String contextOrPlaceholder(String projectContext) {
        return (projectContext == null || projectContext.isBlank()) ? "(제공된 프로젝트 자료 없음)" : projectContext;
    }

    // jobRole/difficulty는 세션 생성 시 선택값이라 둘 다 비어있을 수 있다 - 그 경우 프롬프트에
    // "설정 없음"이라고만 알려주고, 관점/깊이 제약 없이 자유롭게 질문하게 둔다.
    private String buildInterviewSettingsBlock(JobRole jobRole, Difficulty difficulty) {
        List<String> lines = new ArrayList<>();
        String jobRoleGuidance = jobRoleGuidance(jobRole);
        String difficultyGuidance = difficultyGuidance(difficulty);
        if (jobRoleGuidance != null) {
            lines.add("- 관점(직무): " + jobRoleGuidance);
        }
        if (difficultyGuidance != null) {
            lines.add("- 깊이(난이도): " + difficultyGuidance);
        }
        if (lines.isEmpty()) {
            return "(설정된 직무/난이도 없음 - 특별한 관점이나 깊이 제한 없이 자유롭게 질문하세요.)";
        }
        return String.join("\n", lines);
    }

    private String jobRoleGuidance(JobRole jobRole) {
        if (jobRole == null) {
            return null;
        }
        return switch (jobRole) {
            case BACKEND -> "서버, API, DB, 인증, 서버 구조 등 프로젝트 자료에 있는 백엔드 관련 내용을 우선적으로 질문하세요.";
            case FRONTEND -> "UI 상태 관리, 사용자 인터랙션, API 연동 등 프로젝트 자료에 있는 프론트엔드 관련 내용을 우선적으로 질문하세요.";
            case FULLSTACK -> "프론트엔드와 백엔드의 연결, 전체 구조를 균형 있게 질문하세요.";
            case AI -> "AI 모델/API 활용, 프롬프트 설계, 데이터 처리 등 프로젝트 자료에 있는 AI 관련 내용을 우선적으로 질문하세요.";
            case DATA -> "DB, 데이터 구조, 전처리/처리 흐름 등 프로젝트 자료에 있는 데이터 관련 내용을 우선적으로 질문하세요.";
        };
    }

    private String difficultyGuidance(Difficulty difficulty) {
        if (difficulty == null) {
            return null;
        }
        return switch (difficulty) {
            case EASY -> "구현한 내용과 기본 개념을 설명할 수 있는 수준으로 질문하세요.";
            case NORMAL -> "구현 방법, 기술 선택 이유, 프로젝트 적용 과정을 묻는 수준으로 질문하세요.";
            case HARD -> "설계 근거, 트레이드오프, 문제 해결 과정, 대안 비교 등 심화 수준으로 질문하세요.";
        };
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

    private SessionEvaluation parseSessionEvaluation(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해주세요.");
        }

        RawEvaluation parsed;
        try {
            parsed = objectMapper.readValue(stripCodeFence(raw), RawEvaluation.class);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 평가 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.");
        }

        if (parsed.overallContentScore() == null || parsed.overallDeliveryScore() == null
                || parsed.logicScore() == null || parsed.specificityScore() == null
                || isBlank(parsed.strengths()) || isBlank(parsed.weaknesses()) || isBlank(parsed.summaryText())) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 평가 응답 형식이 올바르지 않습니다.");
        }

        return new SessionEvaluation(
                toScore(parsed.overallContentScore()),
                toScore(parsed.overallDeliveryScore()),
                toScore(parsed.logicScore()),
                toScore(parsed.specificityScore()),
                parsed.strengths().trim(),
                parsed.weaknesses().trim(),
                parsed.summaryText().trim());
    }

    // 모델이 범위를 벗어난 점수를 주는 경우가 있어 0~100으로 맞춘다. 숫자가 아닌 값(NaN 등)은 형식 오류로 본다.
    private float toScore(Double value) {
        if (value.isNaN() || value.isInfinite()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 평가 응답 형식이 올바르지 않습니다.");
        }
        return (float) Math.max(0, Math.min(100, value));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RawEvaluation(
            Double overallContentScore,
            Double overallDeliveryScore,
            Double logicScore,
            Double specificityScore,
            String strengths,
            String weaknesses,
            String summaryText
    ) {}

    /**
     * 평가 프롬프트에 넣을 질문 하나와 그 최종 답변. finalAnswerText가 비어 있으면 "(답변 없음)"으로 표시된다.
     * intro는 자기소개(INTRO) 질문, followUp은 꼬리질문 여부다.
     */
    public record EvaluationItem(boolean intro, boolean followUp, String questionText, String finalAnswerText) {

        boolean hasAnswer() {
            return finalAnswerText != null && !finalAnswerText.isBlank();
        }

        String label() {
            if (intro) {
                return "자기소개";
            }
            return followUp ? "꼬리질문" : "질문";
        }
    }
}
