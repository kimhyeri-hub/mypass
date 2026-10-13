import type { SessionDifficulty, SessionJobRole } from '../api/interview';

// 백엔드 enum 값 -> 화면에 보여주는 한글 라벨 (마이페이지/면접 기록 표시용).
// 반대 방향(설정 화면 선택값 -> 요청 enum) 변환은 utils/sessionSettings.ts가 담당한다.
export const JOB_ROLE_LABELS: Record<SessionJobRole, string> = {
  BACKEND: '백엔드 개발자',
  FRONTEND: '프론트엔드 개발자',
  FULLSTACK: '풀스택 개발자',
  AI: 'AI 엔지니어',
  DATA: '데이터 분석가',
};

export const DIFFICULTY_LABELS: Record<SessionDifficulty, string> = {
  EASY: '쉬움',
  NORMAL: '보통',
  HARD: '어려움',
};
