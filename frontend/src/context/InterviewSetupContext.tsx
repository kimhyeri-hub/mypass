import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface InterviewSetupData {
  projectName: string;
  projectDescription: string;
  techStack: string[];
  role: string;
  resumeFileName: string;
  resumeFile: File | null;
  jobRole: string;
  difficulty: '쉬움' | '보통' | '어려움';
  questionCount: number;
  mode: 'practice' | 'live';
  projectId: number | null;
  sessionId: number | null;
  firstQuestion: { questionId: number; questionText: string; questionType: string | null } | null;
}

const defaultData: InterviewSetupData = {
  projectName: '',
  projectDescription: '',
  techStack: [],
  role: '',
  resumeFileName: '',
  resumeFile: null,
  jobRole: '백엔드 개발자',
  difficulty: '보통',
  questionCount: 8,
  mode: 'practice',
  projectId: null,
  sessionId: null,
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

// Provider와 훅을 한 파일에 두는 Context 관례라 fast refresh 규칙만 예외로 둔다 (동작에는 영향 없음).
// eslint-disable-next-line react-refresh/only-export-components
export function useInterviewSetup() {
  const ctx = useContext(InterviewSetupContext);
  if (!ctx) {
    throw new Error('useInterviewSetup은 InterviewSetupProvider 안에서만 사용할 수 있어요.');
  }
  return ctx;
}
