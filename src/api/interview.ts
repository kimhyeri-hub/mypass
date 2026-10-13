// 면접 진행(세션 생성/질문 생성/답변 제출) 관련 백엔드 연동 함수 모음입니다.
// TODO: 배포 환경에 맞게 BASE_URL을 .env(VITE_API_BASE_URL)로 관리하세요. 지금은 로컬 개발 서버를 기본값으로 둡니다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

// 백엔드 없이 화면만 확인하고 싶을 때: 프로젝트 루트에 .env.local 파일을 만들고
// VITE_USE_MOCK=true 한 줄을 넣은 뒤 npm run dev를 다시 실행하세요. (끄려면 줄 삭제)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));
let mockCount = 0;

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
  if (USE_MOCK) {
    await delay();
    mockCount = 0;
    return {
      sessionId: 'mock-session',
      questions: [
        { questionId: 'q-intro', questionText: '간단한 자기소개 부탁드립니다.', questionType: 'INTRO' },
      ],
    };
  }
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
  if (USE_MOCK) {
    await delay(300);
    return;
  }
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
  if (USE_MOCK) {
    await delay();
    return {
      questionId: 'q-1',
      questionText: '프로젝트에서 가장 어려웠던 기술적 문제와 해결 과정을 설명해 주세요.',
      questionType: 'NEW_TOPIC',
    };
  }
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
  if (USE_MOCK) {
    await delay(900);
    mockCount += 1;
    return mockCount % 2 === 1
      ? { type: 'FOLLOW_UP', question: '그 문제를 해결하기 위해 다른 대안은 고려하지 않으셨나요?' }
      : { type: 'NEW_TOPIC', question: '팀 프로젝트에서 의견 충돌이 있었다면 어떻게 조율하셨나요?' };
  }
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
