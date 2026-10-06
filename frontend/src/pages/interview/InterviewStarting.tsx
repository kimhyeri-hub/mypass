import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { createSession } from '../../api/interview';
import { ApiError } from '../../api/client';
import { JOB_ROLE_TO_API, DIFFICULTY_TO_API } from '../../utils/jobRoleLabels';

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

    // 세션을 만들면 백엔드가 자기소개(INTRO) 질문을 자동으로 만들어서 함께 내려준다.
    // 여기서 generateQuestion()을 따로 부르지 않는다 - 첫 화면은 INTRO여야 하고,
    // 첫 프로젝트 질문은 INTRO에 답변한 직후에만 생성한다.
    createSession({
      projectId: data.projectId,
      jobRole: JOB_ROLE_TO_API[data.jobRole],
      difficulty: DIFFICULTY_TO_API[data.difficulty],
      questionCount: data.questionCount,
      // 백엔드 InterviewMode enum은 아직 PRACTICE만 있어서, 'live'는 보낼 값이 없어 생략한다.
      mode: data.mode === 'practice' ? 'PRACTICE' : undefined,
    })
      .then((session) => {
        const introQuestion = session.questions.find((q) => q.questionType === 'INTRO') ?? session.questions[0];
        if (!introQuestion) {
          throw new ApiError(500, '자기소개 질문을 찾을 수 없어요.');
        }
        updateData({
          sessionId: session.sessionId,
          firstQuestion: {
            questionId: introQuestion.questionId,
            questionText: introQuestion.questionText,
            questionType: introQuestion.questionType,
          },
        });
        navigate(data.mode === 'live' ? '/interview/live' : '/interview');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : '면접 세션을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
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
    <div className="flex flex-col items-center py-24 text-center">
      <div className="mb-7 h-14 w-14 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
      <div className="mb-2.5 text-lg font-bold text-ink">첫 질문을 준비하고 있어요</div>
      <p className="max-w-[280px] text-sm text-muted">
        {data.jobRole} · {data.difficulty} 난이도 · 질문 {data.questionCount}개로 면접을 시작할게요
      </p>
    </div>
  );
}
