// Vite 기준. CRA면 process.env.REACT_APP_API_BASE_URL로 바꾸세요.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface QuestionResponse {
  questionId: number;
  questionText: string;
  questionType: "MAIN" | "FOLLOW_UP";
}

export interface AnswerRequest {
  questionId: number;
  answerText: string;
  answerDurationSec?: number;
}

export interface AnswerResponse {
  analysisResult: {
    accuracy: number;
    logic: number;
    specificity: number;
  };
  nextQuestionText: string | null;
  isFollowUp: boolean;
}

export async function fetchQuestion(sessionId: string): Promise<QuestionResponse> {
  const res = await fetch(`${API_BASE_URL}/api/interview/${sessionId}/question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`질문 요청 실패: ${res.status}`);
  return res.json();
}

export async function submitAnswer(
  sessionId: string,
  payload: AnswerRequest
): Promise<AnswerResponse> {
  const res = await fetch(`${API_BASE_URL}/api/interview/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`답변 제출 실패: ${res.status}`);
  return res.json();
}
