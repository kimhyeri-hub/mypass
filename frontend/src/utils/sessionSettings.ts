import type { InterviewSetupData } from '../context/InterviewSetupContext';
import type { SessionDifficulty, SessionJobRole, SessionMode } from '../api/interview';

// 면접 설정 화면(InterviewSetup)의 한글 선택값을 백엔드 POST /api/sessions enum 값으로 바꾼다.
// 화면의 선택지가 바뀌면 이 표도 함께 맞춰야 한다.
const JOB_ROLE_TO_ENUM: Record<string, SessionJobRole> = {
  '백엔드 개발자': 'BACKEND',
  '프론트엔드 개발자': 'FRONTEND',
  '데이터 분석가': 'DATA',
};

const DIFFICULTY_TO_ENUM: Record<InterviewSetupData['difficulty'], SessionDifficulty> = {
  쉬움: 'EASY',
  보통: 'NORMAL',
  어려움: 'HARD',
};

// 매핑에 없는 직무면 undefined - 백엔드는 jobRole을 선택값으로 받아서 null(관점 제한 없음)로 저장한다.
export function toSessionJobRole(jobRole: string): SessionJobRole | undefined {
  return JOB_ROLE_TO_ENUM[jobRole];
}

export function toSessionDifficulty(difficulty: InterviewSetupData['difficulty']): SessionDifficulty {
  return DIFFICULTY_TO_ENUM[difficulty];
}

// 백엔드 InterviewMode는 지금 PRACTICE만 있다. 실전면접(live)은 아직 백엔드 모드가 없어서 보내지 않는다.
export function toSessionMode(mode: InterviewSetupData['mode']): SessionMode | undefined {
  return mode === 'practice' ? 'PRACTICE' : undefined;
}
