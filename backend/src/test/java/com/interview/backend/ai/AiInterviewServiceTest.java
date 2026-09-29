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
}
