import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Analyzing() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1>(0);

  useEffect(() => {
    // TODO: 실제로는 백엔드의 문서 분석 API 응답을 기다렸다가 다음 화면으로 이동합니다.
    const toStructuring = setTimeout(() => setStep(1), 1200);
    const toNext = setTimeout(() => navigate('/interview/setup'), 2400);
    return () => {
      clearTimeout(toStructuring);
      clearTimeout(toNext);
    };
  }, [navigate]);

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
