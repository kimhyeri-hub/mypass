import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { createProject } from '../../api/interview';
import { ApiError } from '../../api/client';

export default function Analyzing() {
  const navigate = useNavigate();
  const { data, updateData } = useInterviewSetup();
  const [step, setStep] = useState<0 | 1>(0);
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const toStructuring = setTimeout(() => setStep(1), 1200);

    createProject({
      title: data.projectName,
      description: data.projectDescription,
      techStack: data.techStack.join(', '),
      role: data.role,
      files: data.resumeFile ? [data.resumeFile] : undefined,
    })
      .then((project) => {
        updateData({ projectId: project.projectId });
        navigate('/interview/setup');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : '자료 분석에 실패했어요. 잠시 후 다시 시도해 주세요.');
      });

    return () => clearTimeout(toStructuring);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center px-10 py-24 text-center">
        <p className="mb-4 max-w-[280px] text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/interview/upload')}
          className="rounded-lg border border-stroke px-5 py-2.5 text-sm text-[#3A3355]"
        >
          ← 이전으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-10 py-24 text-center">
      <div className="mb-7 h-14 w-14 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
      <div className="mb-2.5 text-lg font-bold text-ink">자료를 분석하고 있어요</div>
      <p className="max-w-[280px] text-sm text-muted">
        이력서와 프로젝트 정보를 읽고 나에게 맞는 질문을 준비하고 있어요. 잠시만 기다려주세요.
      </p>

      <div className="mt-7 w-[280px] text-left">
        <div className="mb-2.5 flex items-center gap-2">
          <i className="ti ti-circle-check-filled text-base text-brand" aria-hidden="true" />
          <span className="text-xs text-[#3A3355]">텍스트 추출 완료</span>
        </div>
        <div className="flex items-center gap-2">
          {step === 1 ? (
            <i className="ti ti-circle-check-filled text-base text-brand" aria-hidden="true" />
          ) : (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E2DEF5] border-t-brand" />
          )}
          <span className="text-xs text-[#3A3355]">프로젝트 정보 구조화 중</span>
        </div>
      </div>
    </div>
  );
}
