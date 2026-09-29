export interface InterviewHistoryItem {
  id: string;
  title: string;
  date: string;
  questionCount: number;
  mode: 'practice' | 'live';
  jobRole: string;
  score: number;
}

// TODO: 백엔드 연동 시 이 빈 배열 대신, 사용자의 실제 면접 기록을 API로 받아옵니다.
export const interviewHistory: InterviewHistoryItem[] = [];

export function getInterviewHistoryItem(id: string | undefined) {
  if (!id) return undefined;
  return interviewHistory.find((item) => item.id === id);
}
