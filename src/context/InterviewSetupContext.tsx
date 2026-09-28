import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionQuestion } from '../api/interview';

export interface InterviewSetupData {
  projectName: string;
  projectDescription: string;
  techStack: string[];
  role: string;
  resumeFileName: string;
  jobRole: string;
  difficulty: '쉬움' | '보통' | '어려움';
  questionCount: number;
  mode: 'practice' | 'live';
  // 면접 세션 관련 정보 (createSession 응답에서 채워짐)
  sessionId: string;
  firstQuestion: SessionQuestion | null;
}

const defaultData: InterviewSetupData = {
  projectName: '',
  projectDescription: '',
  techStack: [],
  role: '',
  resumeFileName: '',
  jobRole: '백엔드 개발자',
  difficulty: '보통',
  questionCount: 8,
  mode: 'practice',
  sessionId: '',
  firstQuestion: null,
};

interface InterviewSetupContextValue {
  data: InterviewSetupData;
  updateData: (patch: Partial<InterviewSetupData>) => void;
}

const InterviewSetupContext = createContext<InterviewSetupContextValue | undefined>(undefined);

export function InterviewSetupProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<InterviewSetupData>(defaultData);

  const updateData = (patch: Partial<InterviewSetupData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  return (
    <InterviewSetupContext.Provider value={{ data, updateData }}>
      {children}
    </InterviewSetupContext.Provider>
  );
}

export function useInterviewSetup() {
  const ctx = useContext(InterviewSetupContext);
  if (!ctx) {
    throw new Error('useInterviewSetup은 InterviewSetupProvider 안에서만 사용할 수 있어요.');
  }
  return ctx;
}
