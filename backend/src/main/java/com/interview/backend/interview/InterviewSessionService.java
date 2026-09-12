package com.interview.backend.interview;

import com.interview.backend.interview.dto.AnswerResponse;
import com.interview.backend.interview.dto.CompleteSessionRequest;
import com.interview.backend.interview.dto.CreateAnswerRequest;
import com.interview.backend.interview.dto.CreateQuestionRequest;
import com.interview.backend.interview.dto.CreateSessionRequest;
import com.interview.backend.interview.dto.QuestionResponse;
import com.interview.backend.interview.dto.SessionResponse;
import com.interview.backend.project.Project;
import com.interview.backend.project.ProjectRepository;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class InterviewSessionService {

    private final InterviewSessionRepository sessionRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public InterviewSessionService(
            InterviewSessionRepository sessionRepository,
            QuestionRepository questionRepository,
            AnswerRepository answerRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public SessionResponse createSession(String userEmail, CreateSessionRequest request) {
        User user = getUser(userEmail);

        Project project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));
        if (!project.getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 프로젝트로만 면접을 시작할 수 있습니다.");
        }

        InterviewSession session = new InterviewSession(user.getUserId(), project.getProjectId());
        sessionRepository.save(session);

        return SessionResponse.from(session, List.of());
    }

    public List<SessionResponse> getMySessions(String userEmail) {
        User user = getUser(userEmail);
        return sessionRepository.findByUserIdOrderByStartedAtDesc(user.getUserId()).stream()
                .map(session -> SessionResponse.from(session, List.of()))
                .toList();
    }

    public SessionResponse getSessionDetail(String userEmail, Long sessionId) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        List<QuestionResponse> questions = questionRepository.findBySessionIdOrderBySequenceNoAsc(sessionId).stream()
                .map(question -> {
                    List<AnswerResponse> answers = answerRepository.findByQuestionId(question.getQuestionId()).stream()
                            .map(AnswerResponse::from)
                            .toList();
                    return QuestionResponse.from(question, answers);
                })
                .toList();

        return SessionResponse.from(session, questions);
    }

    @Transactional
    public QuestionResponse addQuestion(String userEmail, Long sessionId, CreateQuestionRequest request) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        Question question = new Question(
                session.getSessionId(),
                request.parentQuestionId(),
                request.sequenceNo(),
                request.questionText(),
                request.questionType(),
                request.ttsAudioUrl()
        );
        questionRepository.save(question);

        return QuestionResponse.from(question, List.of());
    }

    @Transactional
    public AnswerResponse addAnswer(String userEmail, Long sessionId, Long questionId, CreateAnswerRequest request) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "질문을 찾을 수 없습니다."));
        if (!question.getSessionId().equals(session.getSessionId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 세션의 질문이 아닙니다.");
        }

        List<Answer> previousAttempts = answerRepository.findByQuestionId(questionId);
        previousAttempts.forEach(a -> a.setIsFinal(false));
        answerRepository.saveAll(previousAttempts);

        int nextAttemptNo = previousAttempts.size() + 1;
        Answer answer = new Answer(
                questionId,
                nextAttemptNo,
                request.answerText(),
                request.audioUrl(),
                request.videoUrl(),
                request.durationSec()
        );

        return AnswerResponse.from(answerRepository.save(answer));
    }

    @Transactional
    public SessionResponse completeSession(String userEmail, Long sessionId, CompleteSessionRequest request) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        session.setStatus("COMPLETED");
        session.setEndedAt(LocalDateTime.now());
        session.setOverallContentScore(request.overallContentScore());
        session.setOverallDeliveryScore(request.overallDeliveryScore());
        session.setStrengths(request.strengths());
        session.setWeaknesses(request.weaknesses());
        session.setSummaryText(request.summaryText());
        sessionRepository.save(session);

        return getSessionDetail(userEmail, sessionId);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
    }

    private InterviewSession getOwnedSession(User user, Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "면접 세션을 찾을 수 없습니다."));
        if (!session.getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 면접 세션만 접근할 수 있습니다.");
        }
        return session;
    }
}
