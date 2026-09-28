// 면접 진행(세션 생성/질문 생성/답변 제출) 관련 백엔드 연동 함수 모음입니다.
// TODO: 배포 환경에 맞게 BASE_URL을 .env(VITE_API_BASE_URL)로 관리하세요. 지금은 로컬 개발 서버를 기본값으로 둡니다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export type QuestionType = 'INTRO' | 'NEW_TOPIC' | 'FOLLOW_UP';

export interface SessionQuestion {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
}

// ── 세션 생성 ────────────────────────────────────────────────
// 백엔드가 세션 생성 시 session.questions[0]으로 INTRO 질문("간단한 자기소개
// 부탁드립니다.")을 함께 내려줍니다. 이 응답을 받은 직후에는 generateQuestion()을
// 호출하지 않고, questions[0]을 그대로 첫 질문(INTRO)으로 사용합니다.
export interface CreateSessionRequest {
  // TODO: 백엔드가 요구하는 실제 필드명에 맞춰주세요 (이력서 id, 프로젝트 id 등 포함될 수 있음).
  projectName: string;
  jobRole: string;
  difficulty: string;
  questionCount: number;
  mode: 'practice' | 'live';
}

export interface CreateSessionResponse {
  sessionId: string;
  questions: SessionQuestion[];
}

export async function createSession(
  payload: CreateSessionRequest,
): Promise<CreateSessionResponse> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`세션 생성 실패 (status: ${res.status})`);
  }

  return res.json();
}

// ── 답변 제출 (INTRO 전용) ───────────────────────────────────
// INTRO 질문에 대한 답변은 /next로 보내지 않고, submitAnswer()로만 제출합니다.
// (그 이후의 실제 면접 질문 답변은 기존 next()로 제출 + 다음 질문을 함께 받아옵니다.)
export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  answer: string;
}

export async function submitAnswer(payload: SubmitAnswerRequest): Promise<void> {
  const res = await fetch(`${BASE_URL}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`답변 제출 실패 (status: ${res.status})`);
  }
}

// ── 첫 프로젝트 질문 생성 (INTRO 답변 직후 1회) ──────────────
export interface GenerateQuestionResponse {
  questionId: string;
  questionText: string;
  questionType: QuestionType; // 기대값: 'NEW_TOPIC'
}

export async function generateQuestion(sessionId: string): Promise<GenerateQuestionResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/questions/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`질문 생성 실패 (status: ${res.status})`);
  }

  return res.json();
}

// ── 기존 /next (변경 없음) ───────────────────────────────────
// INTRO 이후의 실제 면접 질문에 대해서만 사용합니다. 답변을 제출하면서 동시에
// 다음 질문(FOLLOW_UP 또는 NEW_TOPIC)을 받아옵니다. depth 제한 등은 백엔드 로직 그대로예요.
export type NextQuestionType = 'FOLLOW_UP' | 'NEW_TOPIC';

export interface NextQuestionResponse {
  type: NextQuestionType;
  question: string;
}

export interface NextQuestionRequest {
  interviewId?: string;
  questionId?: string;
  answer: string;
}

export async function next(payload: NextQuestionRequest): Promise<NextQuestionResponse> {
  const res = await fetch(`${BASE_URL}/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`다음 질문 요청 실패 (status: ${res.status})`);
  }

  return res.json();
}
