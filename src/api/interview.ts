// 면접 진행(질문 생성/답변 제출) 관련 백엔드 연동 함수 모음입니다.
// TODO: 배포 환경에 맞게 BASE_URL을 .env(VITE_API_BASE_URL)로 관리하세요. 지금은 로컬 개발 서버를 기본값으로 둡니다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export type NextQuestionType = 'FOLLOW_UP' | 'NEW_TOPIC';

export interface NextQuestionResponse {
  type: NextQuestionType;
  question: string;
}

export interface NextQuestionRequest {
  // TODO: 면접 세션/현재 질문을 식별할 수 있는 값이 백엔드에서 정해지면 여기에 추가합니다.
  interviewId?: string;
  questionId?: string;
  answer: string;
}

/**
 * 방금 제출한 답변을 백엔드로 보내고, 다음 질문을 받아옵니다.
 * 응답의 type이 'FOLLOW_UP'이면 방금 답변에 대한 꼬리질문, 'NEW_TOPIC'이면 새로운 주제의 질문입니다.
 */
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
