import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';

export default function InterviewStarting() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  useEffect(() => {
    // TODO: 실제로는 백엔드가 첫 질문을 생성해서 내려줄 때까지 기다렸다가 이동합니다.
    const timer = setTimeout(() => navigate('/interview'), 1600);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center px-10 py-24 text-center">
      <div className="mb-7 h-14 w-14 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
      <div className="mb-2.5 text-lg font-bold text-ink">첫 질문을 준비하고 있어요</div>
      <p className="max-w-[280px] text-sm text-muted">
        {data.jobRole} · {data.difficulty} 난이도 · 질문 {data.questionCount}개로 면접을 시작할게요
      </p>
    </div>
  );
}
