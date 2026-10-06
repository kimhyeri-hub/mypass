import { apiForm, apiGet, apiJson } from './client';

export interface ProjectFileResponse {
  fileId: number;
  originalName: string;
  fileType: string;
  uploadedAt: string;
}

export interface ProjectResponse {
  projectId: number;
  title: string;
  description: string | null;
  techStack: string | null;
  role: string | null;
  mainFeatures: string | null;
  problemSolving: string | null;
  createdAt: string;
  files: ProjectFileResponse[];
}

export interface CreateProjectPayload {
  title: string;
  description?: string;
  techStack?: string;
  role?: string;
  mainFeatures?: string;
  problemSolving?: string;
  files?: File[];
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectResponse> {
  const formData = new FormData();
  formData.append('title', payload.title);
  if (payload.description) formData.append('description', payload.description);
  if (payload.techStack) formData.append('techStack', payload.techStack);
  if (payload.role) formData.append('role', payload.role);
  if (payload.mainFeatures) formData.append('mainFeatures', payload.mainFeatures);
  if (payload.problemSolving) formData.append('problemSolving', payload.problemSolving);
  payload.files?.forEach((file) => formData.append('files', file));

  return apiForm<ProjectResponse>('POST', '/api/projects', formData);
}

export interface AnswerResponse {
  answerId: number;
  attemptNo: number;
  isFinal: boolean;
  answerText: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  relevanceScore: number | null;
  clarityScore: number | null;
  feedbackText: string | null;
  answeredAt: string;
}

export interface QuestionResponse {
  questionId: number;
  parentQuestionId: number | null;
  sequenceNo: number | null;
  questionText: string;
  questionType: string | null;
  ttsAudioUrl: string | null;
  createdAt: string;
  answers: AnswerResponse[];
}

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type SessionJobRole = 'BACKEND' | 'FRONTEND' | 'FULLSTACK' | 'AI' | 'DATA';
export type SessionDifficulty = 'EASY' | 'NORMAL' | 'HARD';
export type SessionMode = 'PRACTICE';

export interface SessionResponse {
  sessionId: number;
  projectId: number;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  // AI 평가 점수(0~100). 평가 전이거나 평가 없이 종료된 세션이면 null이다.
  overallContentScore: number | null;
  overallDeliveryScore: number | null;
  logicScore: number | null;
  specificityScore: number | null;
  strengths: string | null;
  weaknesses: string | null;
  summaryText: string | null;
  jobRole: SessionJobRole | null;
  difficulty: SessionDifficulty | null;
  questionCount: number | null;
  mode: SessionMode | null;
  questions: QuestionResponse[];
}

// 백엔드 CreateSessionRequest와 같은 구조. projectId 외에는 선택값이라 없으면 세션에 null로 저장된다.
export interface CreateSessionPayload {
  projectId: number;
  jobRole?: SessionJobRole;
  difficulty?: SessionDifficulty;
  // INTRO(자기소개)를 제외한 AI 질문 개수
  questionCount?: number;
  mode?: SessionMode;
}

export async function createSession(payload: CreateSessionPayload): Promise<SessionResponse> {
  return apiJson<SessionResponse>('POST', '/api/sessions', payload);
}

export async function generateQuestion(sessionId: number): Promise<QuestionResponse> {
  return apiJson<QuestionResponse>('POST', `/api/sessions/${sessionId}/questions/generate`);
}

// 방금 등록한 최종 답변(answerId)을 근거로 AI가 꼬리질문(FOLLOW_UP)을 이어갈지
// 새 주제(NEW_TOPIC)로 넘어갈지 판단해서 다음 질문을 받아온다. 자기소개(INTRO) 질문
// 답변 직후에는 호출하지 않는다 - 그때는 generateQuestion()으로 첫 프로젝트 질문을 받는다.
export async function generateNextQuestion(
  sessionId: number,
  questionId: number,
  answerId: number,
): Promise<QuestionResponse> {
  return apiJson<QuestionResponse>(
    'POST',
    `/api/sessions/${sessionId}/questions/${questionId}/answers/${answerId}/next`,
  );
}

export interface SubmitAnswerPayload {
  answerText: string;
}

export async function submitAnswer(
  sessionId: number,
  questionId: number,
  payload: SubmitAnswerPayload,
): Promise<AnswerResponse> {
  return apiJson<AnswerResponse>(
    'POST',
    `/api/sessions/${sessionId}/questions/${questionId}/answers`,
    payload,
  );
}

export async function completeSession(sessionId: number): Promise<SessionResponse> {
  return apiJson<SessionResponse>('POST', `/api/sessions/${sessionId}/complete`, {});
}

// 세션의 실제 질문과 최종 답변을 근거로 AI 최종 평가를 실행하고, 저장된 결과를 받아온다.
// 마지막 질문 답변이 저장된 뒤에만 호출한다 - 면접 도중 호출하면 세션이 바로 종료된다.
export async function evaluateSession(sessionId: number): Promise<SessionResponse> {
  return apiJson<SessionResponse>('POST', `/api/sessions/${sessionId}/evaluate`);
}

// 종료(COMPLETED)된 세션의 저장된 결과를 조회한다. 진행 중인 세션이면 409.
export async function getSessionResult(sessionId: number): Promise<SessionResponse> {
  return apiGet<SessionResponse>(`/api/sessions/${sessionId}/result`);
}
