import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { createSession } from '../../api/interview';
import { ApiError } from '../../api/client';
import ErrorState from '../../components/ErrorState';
import { toSessionDifficulty, toSessionJobRole, toSessionMode } from '../../utils/sessionSettings';

export default function InterviewStarting() {
  const navigate = useNavigate();
  const { data, updateData } = useInterviewSetup();
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<number | undefined>(undefined);
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
    // 설정 화면에서 고른 직무/난이도/질문 개수를 그대로 세션에 저장해야
    // 백엔드의 질문 생성 관점과 questionCount 자동 종료가 프론트 진행률과 같은 기준으로 동작한다.
    createSession({
      projectId: data.projectId,
      jobRole: toSessionJobRole(data.jobRole),
      difficulty: toSessionDifficulty(data.difficulty),
      questionCount: data.questionCount,
      mode: toSessionMode(data.mode),
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
        setErrorCode(err instanceof ApiError ? err.status : undefined);
        setError(err instanceof ApiError ? err.message : '면접 세션을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    // 면접 설정 값은 Context(메모리)에만 있어서 새로고침하면 사라진다 -
    // 다시 시도는 설정 화면으로 돌아가서 설정을 유지한 채 다시 시작하게 한다.
    return (
      <ErrorState
        title="면접을 시작하지 못했어요"
        description={error}
        code={errorCode}
        onRetry={() => navigate('/interview/setup')}
      />
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
