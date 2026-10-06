package com.interview.backend.interview;

import com.interview.backend.ai.AiInterviewService;
import com.interview.backend.ai.NextQuestionDecision;
import com.interview.backend.ai.NextQuestionType;
import com.interview.backend.ai.SessionEvaluation;
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
import java.util.ArrayList;
import java.util.Comparator;
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
        return buildSessionResponse(session);
    }

    /**
     * 마이페이지의 "결과 리포트" 화면 전용 조회. getSessionDetail()과 응답 형태(SessionResponse)는
     * 같지만, 아직 진행 중인 세션의 결과를 잘못 보여주는 일이 없도록 COMPLETED 상태만 허용한다.
     */
    public SessionResponse getSessionResult(String userEmail, Long sessionId) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);
        if (session.getStatus() != SessionStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "아직 진행 중인 면접입니다. 완료 후 결과를 조회해주세요.");
        }
        return buildSessionResponse(session);
    }

    private SessionResponse buildSessionResponse(InterviewSession session) {
        List<QuestionResponse> questions = questionRepository.findBySessionIdOrderBySequenceNoAsc(session.getSessionId()).stream()
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
        requireInProgress(session);

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
        requireInProgress(session);

        List<Question> sessionQuestions = questionRepository.findBySessionIdOrderBySequenceNoAsc(sessionId);
        requireQuestionCountNotReached(session, countTowardLimit(sessionQuestions));

        // 메타데이터는 업로드 문서를 보정하는 우선 근거일 뿐 PDF를 대체하지 않는다 -
        // 업로드 문서 텍스트가 없으면 메타데이터가 있어도 기존처럼 질문을 생성하지 않는다.
        if (collectDocumentText(session.getProjectId()).isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "질문을 생성할 프로젝트 자료가 없습니다. PDF를 먼저 업로드하세요.");
        }

        String context = collectProjectContext(session.getProjectId());

        String questionText = aiInterviewService.generateQuestion(context, session.getJobRole(), session.getDifficulty());

        int nextSequenceNo = sessionQuestions.size() + 1;
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
        requireInProgress(session);

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
        requireQuestionCountNotReached(session, countTowardLimit(sessionQuestions));

        List<String> askedQuestionTexts = sessionQuestions.stream()
                .filter(q -> !q.getQuestionId().equals(question.getQuestionId()))
                .map(Question::getQuestionText)
                .toList();
        int nextSequenceNo = sessionQuestions.size() + 1;

        String projectContext = collectProjectContext(session.getProjectId());
        int followUpDepth = computeFollowUpDepth(question);

        NextQuestionDecision decision;
        if (followUpDepth >= MAX_FOLLOW_UP_DEPTH) {
            String newTopicQuestion = aiInterviewService.generateNewTopicQuestion(
                    projectContext, askedQuestionTexts, session.getJobRole(), session.getDifficulty());
            decision = new NextQuestionDecision(NextQuestionType.NEW_TOPIC, newTopicQuestion);
        } else {
            decision = aiInterviewService.decideNextQuestion(
                    projectContext, question.getQuestionText(), answer.getAnswerText(), askedQuestionTexts,
                    followUpDepth, session.getJobRole(), session.getDifficulty());
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

    /**
     * 질문 생성, 다음 질문(FOLLOW_UP/NEW_TOPIC), 평가가 공통으로 쓰는 프로젝트 컨텍스트.
     * 사용자가 직접 입력한 프로젝트 메타데이터(우선 근거)와 업로드 문서 추출 텍스트(보조 근거)를
     * 구역을 나눠 담는다. 값이 없는 메타데이터 필드와 비어 있는 구역은 출력하지 않고,
     * 둘 다 없으면 빈 문자열을 돌려줘서 기존의 "자료 없음" 처리가 그대로 동작한다.
     */
    private String collectProjectContext(Long projectId) {
        List<String> sections = new ArrayList<>();

        String metadata = projectRepository.findById(projectId)
                .map(this::formatProjectMetadata)
                .orElse("");
        if (!metadata.isBlank()) {
            sections.add("[프로젝트 메타데이터 - 우선 근거]\n" + metadata);
        }

        String documentText = collectDocumentText(projectId);
        if (!documentText.isBlank()) {
            sections.add("[업로드 문서 - 보조 근거]\n" + documentText);
        }

        return String.join("\n\n", sections);
    }

    private String collectDocumentText(Long projectId) {
        return projectFileRepository.findByProjectId(projectId).stream()
                .map(ProjectFile::getExtractedText)
                .filter(text -> text != null && !text.isBlank())
                .collect(Collectors.joining("\n\n"));
    }

    private String formatProjectMetadata(Project project) {
        List<String> lines = new ArrayList<>();
        addMetadataLine(lines, "프로젝트명", project.getTitle());
        addMetadataLine(lines, "설명", project.getDescription());
        addMetadataLine(lines, "기술 스택", project.getTechStack());
        addMetadataLine(lines, "담당 역할", project.getRole());
        return String.join("\n", lines);
    }

    private void addMetadataLine(List<String> lines, String label, String value) {
        if (value != null && !value.isBlank()) {
            lines.add(label + ": " + value.trim());
        }
    }

    @Transactional
    public AnswerResponse addAnswer(String userEmail, Long sessionId, Long questionId, CreateAnswerRequest request) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);
        requireInProgress(session);

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
        AnswerResponse response = AnswerResponse.from(answerRepository.save(answer));

        autoCompleteIfLastQuestionAnswered(session, question);

        return response;
    }

    // 방금 답변한 질문이 세션에 설정된 questionCount만큼의 마지막 질문이면, 클라이언트가
    // 별도로 completeSession()을 호출하지 않아도 여기서 바로 면접을 종료 상태로 전환한다.
    // 총평/점수는 아직 안 채워진 채로 남고(전부 null), 이후 completeSession()이 그 값들만
    // 채워 넣는다 - 그래서 completeSession()은 상태 전이가 아니라 "평가 결과 첨부" 역할이 된다.
    // 자기소개(INTRO) 질문은 questionCount에 포함하지 않으므로 마지막 질문이 될 수 없다.
    private void autoCompleteIfLastQuestionAnswered(InterviewSession session, Question question) {
        Integer limit = session.getQuestionCount();
        Integer sequenceNo = question.getSequenceNo();
        if (limit == null || sequenceNo == null || isIntroQuestion(question)) {
            return;
        }
        long countedUpToThisQuestion = questionRepository.findBySessionIdOrderBySequenceNoAsc(session.getSessionId()).stream()
                .filter(q -> q.getSequenceNo() != null && q.getSequenceNo() <= sequenceNo)
                .filter(q -> !isIntroQuestion(q))
                .count();
        boolean isLastQuestion = countedUpToThisQuestion >= limit;
        if (session.getStatus() == SessionStatus.IN_PROGRESS && isLastQuestion) {
            session.setStatus(SessionStatus.COMPLETED);
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);
        }
    }

    /**
     * 면접 결과(총평/점수)를 세션에 저장한다. questionCount에 도달해 이미 자동 종료됐든,
     * 아직 진행 중인 세션을 중간에 끝내는 것이든 상관없이 호출할 수 있다 - 상태를 IN_PROGRESS에서
     * COMPLETED로 "전이"시키는 게 이 메서드의 역할이 아니라, 평가 결과를 채워 넣고 아직 COMPLETED가
     * 아니면 그때 COMPLETED로 만드는 것뿐이라 여러 번 불러도 안전하다(마지막 호출 값으로 덮어써짐).
     */
    @Transactional
    public SessionResponse completeSession(String userEmail, Long sessionId, CompleteSessionRequest request) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        session.setStatus(SessionStatus.COMPLETED);
        if (session.getEndedAt() == null) {
            session.setEndedAt(LocalDateTime.now());
        }
        session.setOverallContentScore(request.overallContentScore());
        session.setOverallDeliveryScore(request.overallDeliveryScore());
        session.setLogicScore(request.logicScore());
        session.setSpecificityScore(request.specificityScore());
        session.setStrengths(request.strengths());
        session.setWeaknesses(request.weaknesses());
        session.setSummaryText(request.summaryText());
        sessionRepository.save(session);

        return getSessionDetail(userEmail, sessionId);
    }

    /**
     * 세션에서 실제로 나온 질문과 최종 답변(isFinal=true)을 모아 AI 최종 평가를 받고,
     * 그 결과를 기존 completeSession()으로 저장한다 - 저장/상태 전환 로직은 completeSession()을 그대로 쓴다.
     * 최종 답변이 하나도 없으면 AI를 호출하지 않고 400을 반환한다.
     * AI 호출이 실패하면 completeSession()까지 가지 않으므로 세션은 변경되지 않는다.
     */
    @Transactional
    public SessionResponse evaluateSession(String userEmail, Long sessionId) {
        User user = getUser(userEmail);
        InterviewSession session = getOwnedSession(user, sessionId);

        List<AiInterviewService.EvaluationItem> items = questionRepository.findBySessionIdOrderBySequenceNoAsc(sessionId).stream()
                .map(question -> new AiInterviewService.EvaluationItem(
                        isIntroQuestion(question),
                        question.getParentQuestionId() != null,
                        question.getQuestionText(),
                        findFinalAnswerText(question.getQuestionId())))
                .toList();

        boolean hasAnyFinalAnswer = items.stream()
                .anyMatch(item -> item.finalAnswerText() != null && !item.finalAnswerText().isBlank());
        if (!hasAnyFinalAnswer) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "평가할 최종 답변이 없습니다. 질문에 답변한 뒤 평가를 요청해주세요.");
        }

        SessionEvaluation evaluation = aiInterviewService.evaluateSession(collectProjectContext(session.getProjectId()), items);

        CompleteSessionRequest request = new CompleteSessionRequest(
                evaluation.overallContentScore(),
                evaluation.overallDeliveryScore(),
                evaluation.logicScore(),
                evaluation.specificityScore(),
                evaluation.strengths(),
                evaluation.weaknesses(),
                evaluation.summaryText());
        return completeSession(userEmail, sessionId, request);
    }

    // 같은 질문에 다시 답하면 이전 답변은 isFinal=false가 되므로 최종 답변은 보통 하나뿐이다.
    // 데이터 이상으로 여러 개라면 가장 마지막 시도(attemptNo가 가장 큰 것)를 쓴다.
    private String findFinalAnswerText(Long questionId) {
        return answerRepository.findByQuestionId(questionId).stream()
                .filter(answer -> Boolean.TRUE.equals(answer.getIsFinal()))
                .max(Comparator.comparing(Answer::getAttemptNo, Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(Answer::getAnswerText)
                .orElse(null);
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

    // 질문 생성/답변 제출/세션 종료 등 진행 중인 면접에서만 의미가 있는 동작을 시도할 때 호출한다.
    // 이미 종료된 세션에 대한 요청은 조회(getSessionDetail, getMySessions)를 제외하고 전부 막는다.
    private void requireInProgress(InterviewSession session) {
        if (session.getStatus() != SessionStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 종료된 면접 세션입니다.");
        }
    }

    // 자기소개(INTRO) 질문은 면접 시작 시 자동으로 들어가는 질문이라 questionCount에 포함하지 않는다.
    private int countTowardLimit(List<Question> sessionQuestions) {
        return (int) sessionQuestions.stream().filter(q -> !isIntroQuestion(q)).count();
    }

    private boolean isIntroQuestion(Question question) {
        return INTRO_QUESTION_TYPE.equals(question.getQuestionType());
    }

    // 세션 생성 시 questionCount를 지정하지 않았으면(null) 개수를 제한하지 않는다.
    // 지정했다면, 이미 그 개수만큼 질문이 나온 세션에서는 새 질문을 더 생성할 수 없다 -
    // 이 시점에서는 completeSession()을 호출해서 면접을 종료해야 한다.
    private void requireQuestionCountNotReached(InterviewSession session, int currentQuestionCount) {
        Integer limit = session.getQuestionCount();
        if (limit != null && currentQuestionCount >= limit) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "설정한 질문 개수(" + limit + "개)에 도달했습니다. 면접을 종료해주세요.");
        }
    }
}
