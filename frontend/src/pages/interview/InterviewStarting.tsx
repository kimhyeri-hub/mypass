import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { createSession, generateQuestion } from '../../api/interview';
import { ApiError } from '../../api/client';

export default function InterviewStarting() {
  const navigate = useNavigate();
  const { data, updateData } = useInterviewSetup();
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!data.projectId) {
      queueMicrotask(() => setError('등록된 프로젝트를 찾을 수 없어요. 프로젝트 등록부터 다시 진행해 주세요.'));
      return;
    }

    createSession(data.projectId)
      .then((session) => generateQuestion(session.sessionId).then((question) => ({ session, question })))
      .then(({ session, question }) => {
        updateData({
          sessionId: session.sessionId,
          firstQuestion: { questionId: question.questionId, questionText: question.questionText },
        });
        navigate('/interview');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : '첫 질문 생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center px-10 py-24 text-center">
        <p className="mb-4 max-w-[280px] text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/interview/setup')}
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
      <div className="mb-2.5 text-lg font-bold text-ink">첫 질문을 준비하고 있어요</div>
      <p className="max-w-[280px] text-sm text-muted">
        {data.jobRole} · {data.difficulty} 난이도 · 질문 {data.questionCount}개로 면접을 시작할게요
      </p>
    </div>
  );
}
