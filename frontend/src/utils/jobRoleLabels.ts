import type { Difficulty, JobRole } from '../api/interview';
import type { InterviewSetupData } from '../context/InterviewSetupContext';

// 화면에 보여주는 한글 라벨 <-> 백엔드가 쓰는 enum 값 사이의 변환 테이블.
// 면접 설정 화면(선택)과 마이페이지/기록 화면(표시) 양쪽에서 같이 쓴다.
export const JOB_ROLE_TO_API: Record<string, JobRole> = {
  '백엔드 개발자': 'BACKEND',
  '프론트엔드 개발자': 'FRONTEND',
  '데이터 분석가': 'DATA',
};

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  BACKEND: '백엔드 개발자',
  FRONTEND: '프론트엔드 개발자',
  FULLSTACK: '풀스택 개발자',
  AI: 'AI 엔지니어',
  DATA: '데이터 분석가',
};

export const DIFFICULTY_TO_API: Record<InterviewSetupData['difficulty'], Difficulty> = {
  쉬움: 'EASY',
  보통: 'NORMAL',
  어려움: 'HARD',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: '쉬움',
  NORMAL: '보통',
  HARD: '어려움',
};
