export interface InterviewHistoryItem {
  id: string;
  title: string;
  date: string;
  questionCount: number;
  mode: 'practice' | 'live';
  jobRole: string;
}

// TODO: 백엔드 연동 시 이 더미 목록 대신, 사용자의 실제 면접 기록을 API로 받아옵니다.
export const interviewHistory: InterviewHistoryItem[] = [
  {
    id: '1',
    title: '백엔드 개발자 면접',
    date: '2026.09.05',
    questionCount: 8,
    mode: 'practice',
    jobRole: '백엔드 개발자',
  },
  {
    id: '2',
    title: '프론트엔드 개발자 면접',
    date: '2026.08.28',
    questionCount: 6,
    mode: 'live',
    jobRole: '프론트엔드 개발자',
  },
  {
    id: '3',
    title: '데이터 분석가 면접',
    date: '2026.08.14',
    questionCount: 7,
    mode: 'practice',
    jobRole: '데이터 분석가',
  },
];

export function getInterviewHistoryItem(id: string | undefined) {
  if (!id) return undefined;
  return interviewHistory.find((item) => item.id === id);
}
