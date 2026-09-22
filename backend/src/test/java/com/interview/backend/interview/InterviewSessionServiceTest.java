package com.interview.backend.interview;

import com.interview.backend.ai.AiInterviewService;
import com.interview.backend.ai.AiService;
import com.interview.backend.interview.dto.CreateSessionRequest;
import com.interview.backend.interview.dto.QuestionResponse;
import com.interview.backend.interview.dto.SessionResponse;
import com.interview.backend.project.Project;
import com.interview.backend.project.ProjectFile;
import com.interview.backend.project.ProjectFileRepository;
import com.interview.backend.project.ProjectRepository;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InterviewSessionServiceTest {

    @Mock
    private InterviewSessionRepository sessionRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private AnswerRepository answerRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectFileRepository projectFileRepository;

    @Mock
    private UserRepository userRepository;

    // AiService is an interface (mocks fine); AiInterviewService is a thin wrapper
    // around it with no other dependencies, so a real instance is used.
    @Mock
    private AiService aiService;

    private InterviewSessionService sessionService() {
        return new InterviewSessionService(
                sessionRepository, questionRepository, answerRepository,
                projectRepository, projectFileRepository, userRepository,
                new AiInterviewService(aiService));
    }

    private User user(Long id, String email) {
        User user = new User(email, "hashed", "tester");
        user.setUserId(id);
        return user;
    }

    @Test
    void createSessionGeneratesFixedIntroQuestionAsFirstQuestion() {
        Project project = new Project(1L, "약쏘옥", "설명", "Spring", "백엔드", "기능", "문제해결");
        project.setProjectId(100L);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(sessionRepository.save(any(InterviewSession.class))).thenAnswer(invocation -> {
            InterviewSession session = invocation.getArgument(0);
            session.setSessionId(5L);
            return session;
        });
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SessionResponse response = sessionService().createSession(
                "a@example.com", new CreateSessionRequest(100L, null, null, null, null));

        assertThat(response.questions()).hasSize(1);
        QuestionResponse intro = response.questions().get(0);
        // LLM을 부르지 않는 고정 질문이므로 aiService는 이 테스트에서 한 번도 호출되지 않는다.
        assertThat(intro.questionType()).isEqualTo("INTRO");
        assertThat(intro.parentQuestionId()).isNull();
        assertThat(intro.sequenceNo()).isEqualTo(1);
        assertThat(intro.questionText()).contains("자기소개");
        // 면접 설정값을 안 보내면 세션에도 null로 저장된다.
        assertThat(response.jobRole()).isNull();
        assertThat(response.difficulty()).isNull();
        assertThat(response.questionCount()).isNull();
        assertThat(response.mode()).isNull();
    }

    @Test
    void createSessionStoresInterviewSettingsWhenProvided() {
        Project project = new Project(1L, "약쏘옥", "설명", "Spring", "백엔드", "기능", "문제해결");
        project.setProjectId(100L);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(sessionRepository.save(any(InterviewSession.class))).thenAnswer(invocation -> {
            InterviewSession session = invocation.getArgument(0);
            session.setSessionId(5L);
            return session;
        });
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateSessionRequest request = new CreateSessionRequest(
                100L, JobRole.BACKEND, Difficulty.NORMAL, 8, InterviewMode.PRACTICE);
        SessionResponse response = sessionService().createSession("a@example.com", request);

        assertThat(response.jobRole()).isEqualTo(JobRole.BACKEND);
        assertThat(response.difficulty()).isEqualTo(Difficulty.NORMAL);
        assertThat(response.questionCount()).isEqualTo(8);
        assertThat(response.mode()).isEqualTo(InterviewMode.PRACTICE);
    }

    @Test
    void generatesQuestionFromProjectFilesExtractedText() {
        InterviewSession session = new InterviewSession(1L, 100L);
        session.setSessionId(5L);

        ProjectFile file = new ProjectFile(100L, "resume.pdf", "application/pdf", "key");
        file.setExtractedText("Spring Boot와 MariaDB로 만든 면접 서비스");

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of(file));
        when(questionRepository.findBySessionIdOrderBySequenceNoAsc(5L)).thenReturn(List.of());
        when(aiService.generateQuestion(org.mockito.ArgumentMatchers.contains("Spring Boot와 MariaDB로 만든 면접 서비스")))
                .thenReturn("Spring Boot를 선택한 이유는 무엇인가요?");
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuestionResponse response = sessionService().generateQuestion("a@example.com", 5L);

        assertThat(response.questionText()).isEqualTo("Spring Boot를 선택한 이유는 무엇인가요?");
        assertThat(response.sequenceNo()).isEqualTo(1);
    }

    @Test
    void rejectsWhenProjectHasNoExtractedText() {
        InterviewSession session = new InterviewSession(1L, 100L);
        session.setSessionId(5L);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of());

        assertThatThrownBy(() -> sessionService().generateQuestion("a@example.com", 5L))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsGenerateQuestionForAnotherUsersSession() {
        InterviewSession othersSession = new InterviewSession(2L, 100L);
        othersSession.setSessionId(5L);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(othersSession));

        assertThatThrownBy(() -> sessionService().generateQuestion("a@example.com", 5L))
                .isInstanceOf(ResponseStatusException.class);
    }

    private InterviewSession session(Long userId, Long projectId, Long sessionId) {
        InterviewSession session = new InterviewSession(userId, projectId);
        session.setSessionId(sessionId);
        return session;
    }

    private Question question(Long questionId, Long sessionId, String text) {
        Question question = new Question(sessionId, null, 1, text, "AI", null);
        question.setQuestionId(questionId);
        return question;
    }

    private Answer finalAnswer(Long answerId, Long questionId, String text) {
        Answer answer = new Answer(questionId, 1, text, null, null, null);
        answer.setAnswerId(answerId);
        return answer;
    }

    @Test
    void createsFollowUpQuestionWithParentSetToCurrentQuestion() {
        InterviewSession session = session(1L, 100L, 5L);
        Question currentQuestion = question(10L, 5L, "OCR은 어떤 걸 쓰셨나요?");
        Answer answer = finalAnswer(20L, 10L, "AWS Textract를 사용했습니다.");

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(questionRepository.findById(10L)).thenReturn(Optional.of(currentQuestion));
        when(answerRepository.findById(20L)).thenReturn(Optional.of(answer));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of());
        when(questionRepository.findBySessionIdOrderBySequenceNoAsc(5L)).thenReturn(List.of(currentQuestion));
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"FOLLOW_UP\", \"question\": \"성능은 어떤 기준으로 비교했나요?\"}");
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuestionResponse response = sessionService().generateNextQuestion("a@example.com", 5L, 10L, 20L);

        assertThat(response.questionText()).isEqualTo("성능은 어떤 기준으로 비교했나요?");
        assertThat(response.parentQuestionId()).isEqualTo(10L);
        assertThat(response.sequenceNo()).isEqualTo(2);
    }

    @Test
    void createsNewTopicQuestionWithNoParent() {
        InterviewSession session = session(1L, 100L, 5L);
        Question currentQuestion = question(10L, 5L, "OCR은 어떤 걸 쓰셨나요?");
        Answer answer = finalAnswer(20L, 10L, "AWS Textract를 사용했습니다.");

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(questionRepository.findById(10L)).thenReturn(Optional.of(currentQuestion));
        when(answerRepository.findById(20L)).thenReturn(Optional.of(answer));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of());
        when(questionRepository.findBySessionIdOrderBySequenceNoAsc(5L)).thenReturn(List.of(currentQuestion));
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"NEW_TOPIC\", \"question\": \"AWS Lambda를 선택한 이유는 무엇인가요?\"}");
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuestionResponse response = sessionService().generateNextQuestion("a@example.com", 5L, 10L, 20L);

        assertThat(response.questionText()).isEqualTo("AWS Lambda를 선택한 이유는 무엇인가요?");
        assertThat(response.parentQuestionId()).isNull();
    }

    @Test
    void rejectsNextQuestionWhenAnswerIsNotFinal() {
        InterviewSession session = session(1L, 100L, 5L);
        Question currentQuestion = question(10L, 5L, "OCR은 어떤 걸 쓰셨나요?");
        Answer answer = finalAnswer(20L, 10L, "AWS Textract를 사용했습니다.");
        answer.setIsFinal(false);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(questionRepository.findById(10L)).thenReturn(Optional.of(currentQuestion));
        when(answerRepository.findById(20L)).thenReturn(Optional.of(answer));

        assertThatThrownBy(() -> sessionService().generateNextQuestion("a@example.com", 5L, 10L, 20L))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsNextQuestionWhenAnswerBelongsToDifferentQuestion() {
        InterviewSession session = session(1L, 100L, 5L);
        Question currentQuestion = question(10L, 5L, "OCR은 어떤 걸 쓰셨나요?");
        Answer answerForOtherQuestion = finalAnswer(20L, 999L, "다른 질문의 답변입니다.");

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(questionRepository.findById(10L)).thenReturn(Optional.of(currentQuestion));
        when(answerRepository.findById(20L)).thenReturn(Optional.of(answerForOtherQuestion));

        assertThatThrownBy(() -> sessionService().generateNextQuestion("a@example.com", 5L, 10L, 20L))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsNextQuestionForAnotherUsersSession() {
        InterviewSession othersSession = session(2L, 100L, 5L);

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(othersSession));

        assertThatThrownBy(() -> sessionService().generateNextQuestion("a@example.com", 5L, 10L, 20L))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void asksAiNormallyWhenFollowUpDepthIsBelowLimit() {
        InterviewSession session = session(1L, 100L, 5L);
        Question root = question(1L, 5L, "OCR은 어떤 걸 쓰셨나요?");
        Question followUp1 = new Question(5L, 1L, 2, "Textract 세부 구현은 어떻게 했나요?", "AI", null);
        followUp1.setQuestionId(2L);
        Answer answer = finalAnswer(20L, 2L, "Lambda에서 Textract를 호출했습니다.");

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(questionRepository.findById(2L)).thenReturn(Optional.of(followUp1));
        when(questionRepository.findById(1L)).thenReturn(Optional.of(root));
        when(answerRepository.findById(20L)).thenReturn(Optional.of(answer));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of());
        when(questionRepository.findBySessionIdOrderBySequenceNoAsc(5L)).thenReturn(List.of(root, followUp1));
        when(aiService.generateQuestion(any()))
                .thenReturn("{\"type\": \"FOLLOW_UP\", \"question\": \"더 깊은 질문\"}");
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // followUp1의 depth는 1(root=0) - 아직 MAX_FOLLOW_UP_DEPTH(2) 미만이므로 AI가 정상적으로 판단해야 한다.
        QuestionResponse response = sessionService().generateNextQuestion("a@example.com", 5L, 2L, 20L);

        assertThat(response.questionText()).isEqualTo("더 깊은 질문");
        assertThat(response.parentQuestionId()).isEqualTo(2L);
        assertThat(response.sequenceNo()).isEqualTo(3);
    }

    @Test
    void forcesNewTopicWithoutAskingAiWhenFollowUpDepthReachesLimit() {
        InterviewSession session = session(1L, 100L, 5L);
        Question root = question(1L, 5L, "OCR은 어떤 걸 쓰셨나요?");
        Question followUp1 = new Question(5L, 1L, 2, "Textract 세부 구현은 어떻게 했나요?", "AI", null);
        followUp1.setQuestionId(2L);
        Question followUp2 = new Question(5L, 2L, 3, "성능은 어떻게 측정했나요?", "AI", null);
        followUp2.setQuestionId(3L);
        Answer answer = finalAnswer(30L, 3L, "응답시간을 측정했습니다.");

        ProjectFile file = new ProjectFile(100L, "resume.pdf", "application/pdf", "key");
        file.setExtractedText("약쏘옥 프로젝트 자료");

        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(1L, "a@example.com")));
        when(sessionRepository.findById(5L)).thenReturn(Optional.of(session));
        when(questionRepository.findById(3L)).thenReturn(Optional.of(followUp2));
        when(questionRepository.findById(2L)).thenReturn(Optional.of(followUp1));
        when(questionRepository.findById(1L)).thenReturn(Optional.of(root));
        when(answerRepository.findById(30L)).thenReturn(Optional.of(answer));
        when(projectFileRepository.findByProjectId(100L)).thenReturn(List.of(file));
        when(questionRepository.findBySessionIdOrderBySequenceNoAsc(5L)).thenReturn(List.of(root, followUp1, followUp2));
        // JSON이 아닌 순수 텍스트를 응답으로 준다. decideNextQuestion()(JSON 파싱)이 호출됐다면
        // 이 응답은 파싱 실패로 502를 던졌을 것이므로, 그대로 질문 텍스트가 된다는 것 자체가
        // forced 경로(generateNewTopicQuestion, AI에게 type 판단을 맡기지 않는 경로)를 탔다는 증거다.
        when(aiService.generateQuestion(any())).thenReturn("DUR API 연동은 어떻게 구현했나요?");
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // followUp2의 depth는 2(root=0) - MAX_FOLLOW_UP_DEPTH(2)에 도달했으므로 무조건 NEW_TOPIC이어야 한다.
        QuestionResponse response = sessionService().generateNextQuestion("a@example.com", 5L, 3L, 30L);

        assertThat(response.questionText()).isEqualTo("DUR API 연동은 어떻게 구현했나요?");
        assertThat(response.parentQuestionId()).isNull();
        assertThat(response.sequenceNo()).isEqualTo(4);
    }
}
