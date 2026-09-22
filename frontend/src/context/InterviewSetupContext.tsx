import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface InterviewSetupData {
  projectName: string;
  projectDescription: string;
  techStack: string[];
  role: string;
  resumeFileName: string;
  jobRole: string;
  difficulty: '쉬움' | '보통' | '어려움';
  questionCount: number;
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
