package com.interview.backend.ai;

import com.interview.backend.interview.Difficulty;
import com.interview.backend.interview.JobRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
        String question = aiInterviewService.generateQuestion("Spring Boot와 MariaDB로 만든 면접 서비스", null, null);

        assertThat(question).isEqualTo("Spring Boot를 선택한 이유는 무엇인가요?");
    }

    @Test
    void rejectsWhenParsedTextIsBlank() {
        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.generateQuestion("  ", null, null))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsWhenParsedTextIsNull() {
        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.generateQuestion(null, null, null))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void firstQuestionPromptForbidsInventingTechnologiesNotInTheMaterial() {
        when(aiService.generateQuestion(any())).thenReturn("질문");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.generateQuestion("Java와 AWS Lambda로 만든 프로젝트", null, null);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("명시적으로 나온 기술")
                        && prompt.contains("지어내지")
                        && prompt.contains("사실로 전제하지")));
    }

    @Test
    void firstQuestionPromptForbidsExplanationEvaluationCriteriaAndExampleAnswers() {
        when(aiService.generateQuestion(any())).thenReturn("질문");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.generateQuestion("Java와 AWS Lambda로 만든 프로젝트", null, null);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("질문 문장 하나만")
                        && prompt.contains("평가 기준")
                        && prompt.contains("예시 답변")
                        && prompt.contains("번호, 제목, 따옴표")));
    }

    @Test
    void firstQuestionPromptOmitsSettingsGuidanceWhenJobRoleAndDifficultyAreUnset() {
        when(aiService.generateQuestion(any())).thenReturn("질문");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.generateQuestion("Java와 AWS Lambda로 만든 프로젝트", null, null);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("설정된 직무/난이도 없음")));
    }

    @Test
    void firstQuestionPromptIncludesJobRoleAndDifficultyGuidanceAndStillForbidsInventing() {
        when(aiService.generateQuestion(any())).thenReturn("질문");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.generateQuestion("Java와 AWS Lambda로 만든 프로젝트", JobRole.BACKEND, Difficulty.HARD);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("백엔드 관련 내용을 우선적으로 질문")
                        && prompt.contains("트레이드오프")
                        // jobRole/difficulty 가이드가 들어가도 기존 hallucination 방지 규칙은 그대로 남아있어야 한다.
                        && prompt.contains("지어내지")
                        && prompt.contains("해당 직무와 관련된 기술이 자료에 없다면 새로 지어내지 말고")
                        && prompt.contains("난이도가 높다고 해서 자료에 없는 고급 기술을 새로 추가해서는 안")));
    }

    @Test
    void decidesFollowUpFromStructuredJsonResponse() {
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"FOLLOW_UP\", \"question\": \"Textract와 Vision의 성능을 어떤 기준으로 비교했나요?\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        NextQuestionDecision decision = aiInterviewService.decideNextQuestion(
                "프로젝트 자료", "OCR은 어떤 걸 쓰셨나요?", "AWS Textract를 사용했습니다.", List.of(), 0, null, null);

        assertThat(decision.type()).isEqualTo(NextQuestionType.FOLLOW_UP);
        assertThat(decision.question()).isEqualTo("Textract와 Vision의 성능을 어떤 기준으로 비교했나요?");
    }

    @Test
    void decidesNewTopicFromStructuredJsonResponse() {
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"NEW_TOPIC\", \"question\": \"AWS Lambda를 선택한 이유는 무엇인가요?\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        NextQuestionDecision decision = aiInterviewService.decideNextQuestion(
                "프로젝트 자료", "OCR은 어떤 걸 쓰셨나요?", "AWS Textract를 사용했습니다.",
                List.of("OCR은 어떤 걸 쓰셨나요?"), 0, null, null);

        assertThat(decision.type()).isEqualTo(NextQuestionType.NEW_TOPIC);
        assertThat(decision.question()).isEqualTo("AWS Lambda를 선택한 이유는 무엇인가요?");
    }

    @Test
    void parsesJsonWrappedInMarkdownCodeFence() {
        when(aiService.generateQuestion(any()))
                .thenReturn("```json\n{\"type\": \"NEW_TOPIC\", \"question\": \"다음 질문입니다.\"}\n```");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        NextQuestionDecision decision = aiInterviewService.decideNextQuestion(
                "프로젝트 자료", "현재 질문", "답변", List.of(), 1, null, null);

        assertThat(decision.type()).isEqualTo(NextQuestionType.NEW_TOPIC);
        assertThat(decision.question()).isEqualTo("다음 질문입니다.");
    }

    @Test
    void rejectsWhenAiReturnsMalformedJson() {
        when(aiService.generateQuestion(any())).thenReturn("이건 JSON이 아닙니다.");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.decideNextQuestion("자료", "질문", "답변", List.of(), 0, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void rejectsWhenAiReturnsBlankResponse() {
        when(aiService.generateQuestion(any())).thenReturn("   ");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.decideNextQuestion("자료", "질문", "답변", List.of(), 0, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void rejectsWhenAiReturnsUnknownType() {
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"MAYBE\", \"question\": \"질문\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.decideNextQuestion("자료", "질문", "답변", List.of(), 0, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void rejectsWhenFinalAnswerTextIsBlank() {
        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.decideNextQuestion("자료", "질문", "  ", List.of(), 0, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsWhenCurrentQuestionTextIsBlank() {
        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.decideNextQuestion("자료", "  ", "답변", List.of(), 0, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void nextQuestionPromptForbidsInventingTechnologiesNotInTheMaterialOrAnswer() {
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"FOLLOW_UP\", \"question\": \"질문\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.decideNextQuestion(
                "Java와 AWS Lambda로 만든 프로젝트", "현재 질문", "AWS Textract를 사용했습니다.", List.of(), 0, null, null);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("실제로 나온 내용만 사실로 인정")
                        && prompt.contains("지어내지")
                        && prompt.contains("가정해서 질문하지")
                        && prompt.contains("근거 있는 FOLLOW_UP 질문을 만들기 어렵다면")));
    }

    @Test
    void nextQuestionPromptForbidsRepeatingSubstantiallySameQuestions() {
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"NEW_TOPIC\", \"question\": \"질문\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.decideNextQuestion("자료", "현재 질문", "답변", List.of("이전 질문"), 0, null, null);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("표현만 다를 뿐 사실상 같은 질문")));
    }

    @Test
    void nextQuestionPromptOmitsSettingsGuidanceWhenJobRoleAndDifficultyAreUnset() {
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"NEW_TOPIC\", \"question\": \"질문\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.decideNextQuestion("자료", "현재 질문", "답변", List.of(), 0, null, null);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("설정된 직무/난이도 없음")));
    }

    @Test
    void nextQuestionPromptIncludesJobRoleAndDifficultyGuidanceAndStillForbidsInventing() {
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"FOLLOW_UP\", \"question\": \"질문\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.decideNextQuestion(
                "자료", "현재 질문", "답변", List.of(), 0, JobRole.FRONTEND, Difficulty.EASY);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("프론트엔드 관련 내용을 우선적으로 질문")
                        && prompt.contains("기본 개념을 설명할 수 있는 수준")
                        // jobRole/difficulty 가이드가 들어가도 hallucination 방지 규칙은 그대로 남아있어야 한다.
                        && prompt.contains("지어내지")
                        && prompt.contains("해당 직무와 관련된 기술이 자료에 없다면 새로 지어내지 말고")
                        && prompt.contains("난이도가 높다고 해서 자료나 답변에 없는 고급 기술을 새로 추가해서는 안")));
    }

    @Test
    void forcedNewTopicPromptForbidsInventingTechnologiesAndRepeats() {
        when(aiService.generateQuestion(any())).thenReturn("새 주제 질문");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.generateNewTopicQuestion(
                "Java와 AWS Lambda로 만든 프로젝트", List.of("이전 질문"), null, null);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("실제로 등장하는 기술이나 경험만")
                        && prompt.contains("지어내지")
                        && prompt.contains("표현만 다를 뿐 사실상 같은 질문")));
    }

    @Test
    void forcedNewTopicPromptIncludesJobRoleAndDifficultyGuidance() {
        when(aiService.generateQuestion(any())).thenReturn("새 주제 질문");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.generateNewTopicQuestion(
                "자료", List.of("이전 질문"), JobRole.DATA, Difficulty.NORMAL);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("데이터 관련 내용을 우선적으로 질문")
                        && prompt.contains("기술 선택 이유, 프로젝트 적용 과정")
                        && prompt.contains("지어내지")));
    }

    @Test
    void followUpDepthAndAskedQuestionsAreIncludedInThePromptSentToAi() {
        when(aiService.generateQuestion(contains("2단계 이어진 질문")))
                .thenReturn("{\"type\": \"NEW_TOPIC\", \"question\": \"다음 질문\"}");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        aiInterviewService.decideNextQuestion(
                "자료", "질문", "답변", List.of("첫 번째 질문", "두 번째 질문"), 2, null, null);

        verify(aiService).generateQuestion(
                argThat(prompt -> prompt.contains("1. 첫 번째 질문") && prompt.contains("2. 두 번째 질문")));
    }

    @Test
    void generatesNewTopicQuestionAsPlainTextAvoidingAskedQuestions() {
        when(aiService.generateQuestion(any())).thenReturn("  AWS Lambda를 선택한 이유는 무엇인가요?  ");

        AiInterviewService aiInterviewService = new AiInterviewService(aiService);
        String question = aiInterviewService.generateNewTopicQuestion(
                "자료", List.of("OCR은 어떤 걸 쓰셨나요?"), null, null);

        assertThat(question).isEqualTo("AWS Lambda를 선택한 이유는 무엇인가요?");
        verify(aiService).generateQuestion(argThat(prompt -> prompt.contains("OCR은 어떤 걸 쓰셨나요?")));
    }

    @Test
    void rejectsGenerateNewTopicQuestionWhenProjectContextIsBlank() {
        AiInterviewService aiInterviewService = new AiInterviewService(aiService);

        assertThatThrownBy(() -> aiInterviewService.generateNewTopicQuestion("  ", List.of(), null, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private static final String VALID_EVALUATION_JSON = """
            {"overallContentScore": 82, "overallDeliveryScore": 75, "logicScore": 70, "specificityScore": 64,
             "strengths": "OCR 선택 이유를 비용과 정확도로 설명했습니다.",
             "weaknesses": "성능 측정 결과를 수치로 제시하지 못했습니다.",
             "summaryText": "프로젝트 이해도는 좋지만 근거 수치가 부족합니다."}
            """;

    private List<AiInterviewService.EvaluationItem> answeredItems() {
        return List.of(
                new AiInterviewService.EvaluationItem(true, false, "자기소개해주세요", "백엔드를 맡은 김개발입니다."),
                new AiInterviewService.EvaluationItem(false, false, "OCR은 어떤 걸 쓰셨나요?", "AWS Textract를 사용했습니다."),
                new AiInterviewService.EvaluationItem(false, true, "성능은 어떻게 비교했나요?", null));
    }

    @Test
    void evaluatesSessionFromStructuredJsonResponse() {
        when(aiService.generateQuestion(any())).thenReturn(VALID_EVALUATION_JSON);

        SessionEvaluation evaluation = new AiInterviewService(aiService).evaluateSession("프로젝트 자료", answeredItems());

        assertThat(evaluation.overallContentScore()).isEqualTo(82f);
        assertThat(evaluation.overallDeliveryScore()).isEqualTo(75f);
        assertThat(evaluation.logicScore()).isEqualTo(70f);
        assertThat(evaluation.specificityScore()).isEqualTo(64f);
        assertThat(evaluation.strengths()).isEqualTo("OCR 선택 이유를 비용과 정확도로 설명했습니다.");
        assertThat(evaluation.weaknesses()).isEqualTo("성능 측정 결과를 수치로 제시하지 못했습니다.");
        assertThat(evaluation.summaryText()).isEqualTo("프로젝트 이해도는 좋지만 근거 수치가 부족합니다.");
    }

    @Test
    void evaluationParsesJsonWrappedInMarkdownCodeFence() {
        when(aiService.generateQuestion(any())).thenReturn("```json\n" + VALID_EVALUATION_JSON + "\n```");

        SessionEvaluation evaluation = new AiInterviewService(aiService).evaluateSession("프로젝트 자료", answeredItems());

        assertThat(evaluation.logicScore()).isEqualTo(70f);
    }

    @Test
    void evaluationClampsScoresIntoZeroToHundred() {
        when(aiService.generateQuestion(any())).thenReturn("""
                {"overallContentScore": 120, "overallDeliveryScore": -5, "logicScore": 100, "specificityScore": 0,
                 "strengths": "강점", "weaknesses": "약점", "summaryText": "총평"}
                """);

        SessionEvaluation evaluation = new AiInterviewService(aiService).evaluateSession("프로젝트 자료", answeredItems());

        assertThat(evaluation.overallContentScore()).isEqualTo(100f);
        assertThat(evaluation.overallDeliveryScore()).isEqualTo(0f);
        assertThat(evaluation.logicScore()).isEqualTo(100f);
        assertThat(evaluation.specificityScore()).isEqualTo(0f);
    }

    @Test
    void rejectsEvaluationWhenAnyRequiredFieldIsMissing() {
        when(aiService.generateQuestion(any())).thenReturn("""
                {"overallContentScore": 80, "overallDeliveryScore": 70, "logicScore": 60,
                 "strengths": "강점", "weaknesses": "약점", "summaryText": "총평"}
                """);

        assertThatThrownBy(() -> new AiInterviewService(aiService).evaluateSession("프로젝트 자료", answeredItems()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void rejectsEvaluationWhenTextFieldIsBlank() {
        when(aiService.generateQuestion(any())).thenReturn("""
                {"overallContentScore": 80, "overallDeliveryScore": 70, "logicScore": 60, "specificityScore": 50,
                 "strengths": "  ", "weaknesses": "약점", "summaryText": "총평"}
                """);

        assertThatThrownBy(() -> new AiInterviewService(aiService).evaluateSession("프로젝트 자료", answeredItems()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void rejectsEvaluationWhenAiReturnsMalformedJson() {
        when(aiService.generateQuestion(any())).thenReturn("평가 결과: 80점입니다.");

        assertThatThrownBy(() -> new AiInterviewService(aiService).evaluateSession("프로젝트 자료", answeredItems()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void rejectsEvaluationWithoutCallingAiWhenNoQuestionHasAFinalAnswer() {
        List<AiInterviewService.EvaluationItem> unanswered = List.of(
                new AiInterviewService.EvaluationItem(true, false, "자기소개해주세요", null),
                new AiInterviewService.EvaluationItem(false, false, "OCR은 어떤 걸 쓰셨나요?", "  "));

        assertThatThrownBy(() -> new AiInterviewService(aiService).evaluateSession("프로젝트 자료", unanswered))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(aiService, never()).generateQuestion(any());
    }

    @Test
    void evaluationPromptIncludesQuestionsAnswersAndMarksUnansweredQuestions() {
        when(aiService.generateQuestion(any())).thenReturn(VALID_EVALUATION_JSON);

        new AiInterviewService(aiService).evaluateSession("Textract 기반 OCR 프로젝트", answeredItems());

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("Textract 기반 OCR 프로젝트")
                        && prompt.contains("[자기소개] 자기소개해주세요")
                        && prompt.contains("[질문] OCR은 어떤 걸 쓰셨나요?")
                        && prompt.contains("답변: AWS Textract를 사용했습니다.")
                        && prompt.contains("[꼬리질문] 성능은 어떻게 비교했나요?")
                        && prompt.contains("답변: (답변 없음)")));
    }

    @Test
    void evaluationPromptContainsHallucinationIntroAndDeliveryRules() {
        when(aiService.generateQuestion(any())).thenReturn(VALID_EVALUATION_JSON);

        new AiInterviewService(aiService).evaluateSession("프로젝트 자료", answeredItems());

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("실제 질문과 실제 최종 답변에서 확인할 수 있는 내용만 평가")
                        && prompt.contains("사실과 맞는지 확인하는 보조 근거로만")
                        && prompt.contains("답변에서 언급하지 않은 내용을 지원자가 알고 있다고 판단해서 점수를 올리지 마세요")
                        && prompt.contains("지원자가 말하지 않은 기술, 경험, 역할을 추측")
                        && prompt.contains("부족한 답변을 임의로 보완")
                        && prompt.contains("실제 답변에서 확인 가능한 근거")
                        && prompt.contains("기술적 세부사항이 부족하다는 이유만으로 specificityScore나 다른 점수를 감점하지 마세요")
                        && prompt.contains("발음, 말하기 속도, 목소리 떨림, 억양 등 음성 특성은 평가하지 마세요")
                        && prompt.contains("\"summaryText\"")));
    }

    @Test
    void evaluationPromptForbidsTreatingUnverifiedQuestionPremisesAsFacts() {
        when(aiService.generateQuestion(any())).thenReturn(VALID_EVALUATION_JSON);

        new AiInterviewService(aiService).evaluateSession("Spring Boot와 MariaDB로 만든 일정 관리 서비스", answeredItems());

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("AI가 생성한 것이라 근거 없는 전제가 포함되어 있을 수 있습니다")
                        && prompt.contains("기술명, 프레임워크, 구현 방식, 역할 등의 전제를 무조건 사실이라고 가정하지 마세요")
                        && prompt.contains("그 전제에 답하지 못했다는 이유로 감점하지 마세요")
                        && prompt.contains("충돌하면 [프로젝트 자료]를 우선 근거로 사용하세요")
                        && prompt.contains("근거 없는 질문 전제 때문에 지원자에게 불이익을 주지 마세요")
                        && prompt.contains("strengths, weaknesses, summaryText에서도 확인되지 않은 질문 전제를 사실처럼 반복하지 마세요")));
    }

    @Test
    void evaluationPromptKeepsUnverifiedQuestionPremiseAlongsideMaterialThatContradictsIt() {
        // 질문 생성 AI가 자료에 없는 FastAPI를 전제로 질문한 상황 - 평가 프롬프트에는 질문이 그대로 들어가되,
        // 자료(Spring Boot)를 우선 근거로 삼고 FastAPI 전제로 감점하지 말라는 예시 규칙이 함께 들어가야 한다.
        List<AiInterviewService.EvaluationItem> items = List.of(
                new AiInterviewService.EvaluationItem(false, false,
                        "FastAPI를 백엔드 프레임워크로 선택하셨는데, 비동기 처리가 어떤 이점을 제공했나요?",
                        "저희는 Spring Boot로 API를 만들었고 스케줄링은 직접 구현했습니다."));
        when(aiService.generateQuestion(any())).thenReturn(VALID_EVALUATION_JSON);

        new AiInterviewService(aiService).evaluateSession("Spring Boot와 MariaDB로 만든 일정 관리 서비스", items);

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("Spring Boot와 MariaDB로 만든 일정 관리 서비스")
                        && prompt.contains("[질문] FastAPI를 백엔드 프레임워크로 선택하셨는데")
                        && prompt.contains("FastAPI 사용이 확인되지 않는다면, \"FastAPI에 대해 답하지 못했다\"는 이유로 감점하거나 weaknesses에 쓰지 마세요")));
    }

    private static final String CONFLICTING_CONTEXT = """
            [프로젝트 메타데이터 - 우선 근거]
            프로젝트명: 약쏘옥
            기술 스택: react, java spring boot
            담당 역할: 백엔드

            [업로드 문서 - 보조 근거]
            * Backend (FastAPI): 비즈니스 로직 처리 및 스케줄링 알고리즘 연산
            BE - Business Logic 담당 팀원: 동적 스케줄링 알고리즘 구현""";

    // 질문 생성 / 다음 질문(FOLLOW_UP 판단) / 강제 새 주제 / 평가 4개 프롬프트를 순서대로 캡처한다.
    private List<String> captureAllFourPrompts() {
        when(aiService.generateQuestion(any())).thenReturn(
                "질문",
                "{\"type\": \"NEW_TOPIC\", \"question\": \"다음 질문\"}",
                "새 주제 질문",
                VALID_EVALUATION_JSON);

        AiInterviewService service = new AiInterviewService(aiService);
        service.generateQuestion(CONFLICTING_CONTEXT, null, null);
        service.decideNextQuestion(CONFLICTING_CONTEXT, "현재 질문", "답변", List.of(), 0, null, null);
        service.generateNewTopicQuestion(CONFLICTING_CONTEXT, List.of("이전 질문"), null, null);
        service.evaluateSession(CONFLICTING_CONTEXT, answeredItems());

        org.mockito.ArgumentCaptor<String> captor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(aiService, org.mockito.Mockito.times(4)).generateQuestion(captor.capture());
        return captor.getAllValues();
    }

    @Test
    void allPromptsPreferMetadataOverUploadedDocumentWhenTheyConflict() {
        List<String> prompts = captureAllFourPrompts();

        assertThat(prompts).hasSize(4).allSatisfy(prompt -> assertThat(prompt)
                .contains("[프로젝트 메타데이터]는 지원자가 직접 입력한 현재 프로젝트 정보입니다")
                .contains("[업로드 문서]는 세부 구현 경험을 파악하기 위한 보조 자료이며")
                .contains("내용이 충돌하면 [프로젝트 메타데이터]를 우선하세요")
                .contains("[업로드 문서]에만 나오는 다른 기술을 현재 사용 기술이라고 단정하지 마세요"));
    }

    @Test
    void allPromptsForbidAttributingTeammatesFeaturesToTheCandidate() {
        List<String> prompts = captureAllFourPrompts();

        assertThat(prompts).hasSize(4).allSatisfy(prompt -> assertThat(prompt)
                .contains("프로젝트 전체에서 쓴 기술·기능과 지원자의 담당 역할을 구분하세요")
                .contains("다른 팀원의 담당으로 적힌 기능을 지원자가 직접 구현했다고 단정하지 마세요"));
    }

    @Test
    void onlyQuestionPromptsRequireConfirmationStyleQuestionsForUnclearOrConflictingSources() {
        List<String> prompts = captureAllFourPrompts();

        assertThat(prompts.subList(0, 3)).allSatisfy(prompt -> assertThat(prompt)
                .contains("단정형 질문 대신 확인형 질문을 사용하세요")
                .contains("FastAPI 사용을 현재 사실로 전제하지 마세요")
                .contains("지원자가 직접 구현했다고 전제하지 마세요"));
        assertThat(prompts.get(3)).doesNotContain("확인형 질문을 사용하세요");
    }

    @Test
    void onlyEvaluationPromptForbidsPenalizingForTeammatesFeatures() {
        List<String> prompts = captureAllFourPrompts();

        assertThat(prompts.get(3))
                .contains("다른 팀원의 담당 기능에 대해 지원자가 구현 세부사항을 설명하지 못했다는 이유로 감점하지 마세요")
                // 기존 질문 전제 검증 규칙도 그대로 유지되어야 한다.
                .contains("기술명, 프레임워크, 구현 방식, 역할 등의 전제를 무조건 사실이라고 가정하지 마세요");
        assertThat(prompts.subList(0, 3)).allSatisfy(prompt -> assertThat(prompt)
                .doesNotContain("설명하지 못했다는 이유로 감점하지 마세요"));
    }

    @Test
    void conflictingMetadataAndDocumentAreBothPassedWithPriorityRulesToEvaluation() {
        when(aiService.generateQuestion(any())).thenReturn(VALID_EVALUATION_JSON);

        new AiInterviewService(aiService).evaluateSession(CONFLICTING_CONTEXT, answeredItems());

        verify(aiService).generateQuestion(argThat(prompt ->
                prompt.contains("[프로젝트 메타데이터 - 우선 근거]")
                        && prompt.contains("기술 스택: react, java spring boot")
                        && prompt.contains("[업로드 문서 - 보조 근거]")
                        && prompt.contains("Backend (FastAPI)")
                        && prompt.contains("충돌하면 [프로젝트 메타데이터]를 우선하세요")));
    }
}
