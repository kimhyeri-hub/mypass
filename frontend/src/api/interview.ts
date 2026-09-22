import { apiForm, apiJson } from './client';

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

export interface SessionResponse {
  sessionId: number;
  projectId: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  overallContentScore: number | null;
  overallDeliveryScore: number | null;
  strengths: string | null;
  weaknesses: string | null;
  summaryText: string | null;
  questions: QuestionResponse[];
}

export async function createSession(projectId: number): Promise<SessionResponse> {
  return apiJson<SessionResponse>('POST', '/api/sessions', { projectId });
}

export async function generateQuestion(sessionId: number): Promise<QuestionResponse> {
  return apiJson<QuestionResponse>('POST', `/api/sessions/${sessionId}/questions/generate`);
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
