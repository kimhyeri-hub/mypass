import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { createSession } from '../../api/interview';
import ErrorState from '../../components/ErrorState';

export default function InterviewStarting() {
  const navigate = useNavigate();
  const { data, updateData } = useInterviewSetup();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setError('');
      try {
        // 세션을 생성하면 백엔드가 session.questions[0]으로 INTRO 질문을 함께 내려줘요.
        // 여기서는 그 INTRO 질문을 컨텍스트에 저장만 하고, generateQuestion()은 호출하지 않습니다.
        // (첫 프로젝트 질문은 INTRO 답변을 제출한 뒤 InterviewScreen에서 생성합니다.)
        const session = await createSession({
          projectName: data.projectName,
          jobRole: data.jobRole,
          difficulty: data.difficulty,
          questionCount: data.questionCount,
          mode: data.mode,
        });

        if (cancelled) return;

        const introQuestion = session.questions[0] ?? null;
        updateData({ sessionId: session.sessionId, firstQuestion: introQuestion });

        const destination = data.mode === 'live' ? '/interview/live' : '/interview';
        navigate(destination);
      } catch (err) {
        if (cancelled) return;
        setError('면접을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    };

    start();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <ErrorState
        title="면접을 시작하지 못했어요"
        description="잠시 후 다시 시도해 주세요. 문제가 계속되면 마이페이지로 돌아가 주세요."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="mb-7 h-14 w-14 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
      <div className="mb-2.5 text-lg font-bold text-ink">첫 질문을 준비하고 있어요</div>
      <p className="max-w-[280px] text-sm text-muted">
        {data.jobRole} · {data.difficulty} 난이도 · 질문 {data.questionCount}개로 면접을 시작할게요
      </p>
    </div>
  );
}
