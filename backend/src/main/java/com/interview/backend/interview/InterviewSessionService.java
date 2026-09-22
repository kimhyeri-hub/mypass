package com.interview.backend.interview;

import com.interview.backend.ai.AiInterviewService;
import com.interview.backend.ai.NextQuestionDecision;
import com.interview.backend.ai.NextQuestionType;
import com.interview.backend.interview.dto.AnswerResponse;
import com.interview.backend.interview.dto.CompleteSessionRequest;
import com.interview.backend.interview.dto.CreateAnswerRequest;
import com.interview.backend.interview.dto.CreateQuestionRequest;
import com.interview.backend.interview.dto.CreateSessionRequest;
import com.interview.backend.interview.dto.QuestionResponse;
import com.interview.backend.interview.dto.SessionResponse;
import com.interview.backend.project.Project;
import com.interview.backend.project.ProjectFile;
import com.interview.backend.project.ProjectFileRepository;
import com.interview.backend.project.ProjectRepository;
import com.interview.backend.user.User;
import com.interview.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InterviewSessionService {

    // 실제 면접관이 대화를 여는 것처럼, 세션 시작 시 매번 LLM을 부르지 않고 고정 문구로 시작한다.
    private static final String INTRO_QUESTION_TEXT =
            "안녕하세요. 간단한 자기소개와 함께 본인이 진행한 주요 프로젝트에 대해 소개해주세요.";
    private static final String INTRO_QUESTION_TYPE = "INTRO";
    private static final String AI_QUESTION_TYPE = "AI";

    // 하나의 최초 질문(root)에서 허용하는 최대 꼬리질문 개수.
    // 현재 질문의 깊이(root=0)가 이 값 이상이면 AI에게 FOLLOW_UP/NEW_TOPIC을 묻지 않고 NEW_TOPIC으로 강제한다.
    private static final int MAX_FOLLOW_UP_DEPTH = 2;

    private final InterviewSessionRepository sessionRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final UserRepository userRepository;
    private final AiInterviewService aiInterviewService;

    public InterviewSessionService(
            InterviewSessionRepository sessionRepository,
            QuestionRepository questionRepository,
            AnswerRepository answerRepository,
            ProjectRepository projectRepository,
            ProjectFileRepository projectFileRepository,
            UserRepository userRepository,
            AiInterviewService aiInterviewService
    ) {
        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.projectRepository = projectRepository;
        this.projectFileRepository = projectFileRepository;
        this.userRepository = userRepository;
        this.aiInterviewService = aiInterviewService;
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
        // 면접 설정값 - 전부 선택값이라 요청에 없으면 그대로 null로 저장된다.
        // 아직 질문 생성 프롬프트나 종료 로직에는 쓰지 않는다.
        session.setJobRole(request.jobRole());
        session.setDifficulty(request.difficulty());
        session.setQuestionCount(request.questionCount());
        session.setMode(request.mode());
        sessionRepository.save(session);

        // 세션 시작과 동시에 자기소개 질문을 1번으로 생성한다. LLM 호출 없이 고정 문구를 쓰므로
        // 실패할 일이 없고, 프론트에서 세션 생성 직후 바로 첫 질문을 보여줄 수 있다.
        Question introQuestion = new Question(session.getSessionId(), null, 1, INTRO_QUESTION_TEXT, INTRO_QUESTION_TYPE, null);
        questionRepository.save(introQuestion);

        return SessionResponse.from(session, List.of(QuestionResponse.from(introQuestion, List.of())));
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
    public QuestionResponse generateQuestion(String userEmail, Long sessionId) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        String context = collectProjectContext(session.getProjectId());

        String questionText = aiInterviewService.generateQuestion(context);

        int nextSequenceNo = questionRepository.findBySessionIdOrderBySequenceNoAsc(sessionId).size() + 1;
        Question question = new Question(sessionId, null, nextSequenceNo, questionText, AI_QUESTION_TYPE, null);
        questionRepository.save(question);

        return QuestionResponse.from(question, List.of());
    }

    /**
     * 방금 등록된 최종 답변을 근거로 AI가 다음 질문을 결정해서 저장한다.
     * addAnswer()와 분리된 별도 트랜잭션 - 답변 저장 자체는 AI 호출 없이 즉시 끝난다.
     *
     * 현재 질문이 최초 질문(root)에서 이미 {@link #MAX_FOLLOW_UP_DEPTH}번 꼬리질문을 거쳤다면,
     * AI에게 FOLLOW_UP/NEW_TOPIC 판단을 맡기지 않고 무조건 새로운 주제로 넘어간다 - 그래야
     * AI가 계속 FOLLOW_UP을 골라도 한 주제에 무한히 머무르지 않는다.
     *
     * 나중에 "전체 질문 수/면접 시간 기준 종료"를 추가할 때는 이 메서드 시작 부분에
     * 같은 방식(세션당 질문 개수·시작 시각 확인 후 조기 반환)으로 종료 조건을 더 끼워 넣을 수 있다.
     */
    @Transactional
    public QuestionResponse generateNextQuestion(String userEmail, Long sessionId, Long questionId, Long answerId) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "질문을 찾을 수 없습니다."));
        if (!question.getSessionId().equals(session.getSessionId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 세션의 질문이 아닙니다.");
        }

        Answer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "답변을 찾을 수 없습니다."));
        if (!answer.getQuestionId().equals(question.getQuestionId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 질문의 답변이 아닙니다.");
        }
        if (!Boolean.TRUE.equals(answer.getIsFinal())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "최종 답변에 대해서만 다음 질문을 생성할 수 있습니다.");
        }

        List<Question> sessionQuestions = questionRepository.findBySessionIdOrderBySequenceNoAsc(sessionId);
        List<String> askedQuestionTexts = sessionQuestions.stream()
                .filter(q -> !q.getQuestionId().equals(question.getQuestionId()))
                .map(Question::getQuestionText)
                .toList();
        int nextSequenceNo = sessionQuestions.size() + 1;

        String projectContext = collectProjectContext(session.getProjectId());
        int followUpDepth = computeFollowUpDepth(question);

        NextQuestionDecision decision;
        if (followUpDepth >= MAX_FOLLOW_UP_DEPTH) {
            String newTopicQuestion = aiInterviewService.generateNewTopicQuestion(projectContext, askedQuestionTexts);
            decision = new NextQuestionDecision(NextQuestionType.NEW_TOPIC, newTopicQuestion);
        } else {
            decision = aiInterviewService.decideNextQuestion(
                    projectContext, question.getQuestionText(), answer.getAnswerText(), askedQuestionTexts, followUpDepth);
        }

        Long parentQuestionId = decision.type() == NextQuestionType.FOLLOW_UP ? question.getQuestionId() : null;
        Question nextQuestion = new Question(sessionId, parentQuestionId, nextSequenceNo, decision.question(), AI_QUESTION_TYPE, null);
        questionRepository.save(nextQuestion);

        return QuestionResponse.from(nextQuestion, List.of());
    }

    /**
     * parentQuestionId 체인을 루트까지 따라 올라가며 깊이를 센다. 루트 질문은 0, 그 꼬리질문은 1, ...
     * FK가 항상 먼저 생성된 질문만 가리킬 수 있어 순환은 생기지 않지만, 데이터 이상 상황에 대비해
     * 안전 한도를 둔다.
     */
    private int computeFollowUpDepth(Question question) {
        int depth = 0;
        Long parentId = question.getParentQuestionId();
        while (parentId != null) {
            depth++;
            if (depth > 100) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "질문 체인이 비정상적으로 깁니다.");
            }
            Question parent = questionRepository.findById(parentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "질문 체인이 손상되었습니다."));
            parentId = parent.getParentQuestionId();
        }
        return depth;
    }

    private String collectProjectContext(Long projectId) {
        return projectFileRepository.findByProjectId(projectId).stream()
                .map(ProjectFile::getExtractedText)
                .filter(text -> text != null && !text.isBlank())
                .collect(Collectors.joining("\n\n"));
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
