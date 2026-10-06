import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import ErrorState from '../../components/ErrorState';
import { getSessionResult } from '../../api/interview';
import type { QuestionResponse, SessionJobRole, SessionResponse } from '../../api/interview';
import { ApiError } from '../../api/client';

const JOB_ROLE_LABELS: Record<SessionJobRole, string> = {
  BACKEND: '백엔드',
  FRONTEND: '프론트엔드',
  FULLSTACK: '풀스택',
  AI: 'AI',
  DATA: '데이터',
};

function formatDate(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return '—';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  const totalSec = Math.round(ms / 1000);
  return `${Math.floor(totalSec / 60)}분 ${totalSec % 60}초`;
}

function finalAnswerText(question: QuestionResponse) {
  const text = question.answers.find((a) => a.isFinal)?.answerText;
  return text && text.trim() ? text : null;
}

// 4개 점수 중 값이 있는 것만 평균 낸다. 평가 전이라 모두 null이면 null.
function averageScore(scores: (number | null)[]) {
  const values = scores.filter((s): s is number => s !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, s) => sum + s, 0) / values.length);
}

function headline(score: number | null) {
  if (score === null) return 'AI 평가 결과가 아직 없어요';
  if (score >= 80) return '전반적으로 좋은 답변이었어요';
  if (score >= 60) return '기본기는 갖췄어요, 조금 더 다듬어 봐요';
  return '보완할 부분이 보여요';
}

function ResultHeader({ onMyPage }: { onMyPage?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-stroke bg-white px-10 py-[22px]">
      <Logo size="sm" to="/" />
      {onMyPage && (
        <button
          type="button"
          onClick={onMyPage}
          className="rounded-lg bg-[#F4F2FA] px-3.5 py-2 text-xs font-semibold text-muted hover:text-ink"
        >
          마이페이지로
        </button>
      )}
    </div>
  );
}

export default function InterviewResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const { data } = useInterviewSetup();

  // URL의 sessionId를 우선 쓰고, 예전 주소(/interview/result)로 들어온 경우엔 진행했던 세션 id를 쓴다.
  const parsedId = id !== undefined ? Number(id) : data.sessionId;
  const sessionId = parsedId !== null && Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  // 면접 직후에는 /evaluate 응답을 라우터 state로 받아 바로 보여주고,
  // 다시보기·새로고침처럼 state가 없으면 /result API로 저장된 결과를 다시 불러온다.
  const routerSession = (location.state as { session?: SessionResponse } | null)?.session ?? null;
  const [session, setSession] = useState<SessionResponse | null>(
    routerSession && routerSession.sessionId === sessionId ? routerSession : null,
  );
  const [loadError, setLoadError] = useState<{ message: string; code?: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const current = session && session.sessionId === sessionId ? session : null;

  useEffect(() => {
    if (current || sessionId === null) return;
    let cancelled = false;
    getSessionResult(sessionId)
      .then((result) => {
        if (!cancelled) setSession(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? { message: err.message, code: err.status }
            : { message: '면접 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [current, sessionId, reloadKey]);

  if (sessionId === null || loadError) {
    return (
      <div className="min-h-screen bg-canvas">
        <ResultHeader />
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
          <ErrorState
            title="결과를 불러오지 못했어요"
            description={
              loadError?.message ?? '해당 면접 기록을 찾을 수 없어요. 마이페이지에서 다시 선택해 주세요.'
            }
            code={loadError?.code}
            onRetry={
              loadError
                ? () => {
                    setLoadError(null);
                    setReloadKey((prev) => prev + 1);
                  }
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen bg-canvas">
        <ResultHeader />
        <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-7 h-16 w-16 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
          <div className="mb-2 text-lg font-bold text-ink">면접 결과를 불러오고 있어요</div>
          <p className="max-w-[320px] text-sm leading-relaxed text-muted">저장된 AI 평가 결과를 가져오는 중이에요.</p>
        </div>
      </div>
    );
  }

  const traits = [
    { label: '내용 적합성', score: current.overallContentScore },
    { label: '전달력', score: current.overallDeliveryScore },
    { label: '논리성', score: current.logicScore },
    { label: '구체성', score: current.specificityScore },
  ];
  const overallScore = averageScore(traits.map((t) => t.score));
  const questions = [...current.questions].sort((a, b) => (a.sequenceNo ?? 0) - (b.sequenceNo ?? 0));
  const answeredCount = questions.filter((q) => finalAnswerText(q) !== null).length;
  const followUpCount = questions.filter((q) => q.parentQuestionId !== null).length;
  const projectQuestionCount = questions.filter((q) => q.questionType !== 'INTRO').length;
  const jobRoleLabel = current.jobRole ? JOB_ROLE_LABELS[current.jobRole] : null;
  const dateLabel = formatDate(current.startedAt);
  // 면접 직후(라우터 state로 진입)가 아니면 지난 면접 다시보기로 표시한다.
  const isReviewMode = !(routerSession && routerSession.sessionId === sessionId);
  // INTRO를 뺀 프로젝트 질문에만 "질문 1, 2..." 번호를 붙인다.
  const projectQuestionNumbers = new Map<number, number>();
  questions
    .filter((q) => q.questionType !== 'INTRO')
    .forEach((q, index) => projectQuestionNumbers.set(q.questionId, index + 1));

  return (
    <div className="min-h-screen bg-canvas">
      <ResultHeader onMyPage={() => navigate('/mypage')} />

      <div className="mx-auto max-w-[760px] px-6 py-11">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-card px-2.5 py-1 text-[11.5px] font-bold text-brand">모의면접</span>
          {isReviewMode && (
            <span className="rounded-full bg-[#F4F2FA] px-2.5 py-1 text-[11.5px] font-bold text-muted">
              지난 면접 다시보기
            </span>
          )}
          <span className="text-xs text-muted">
            {[dateLabel, jobRoleLabel, `질문 ${projectQuestionCount}개`].filter(Boolean).join(' · ')}
          </span>
        </div>

        <div className="mb-7 flex items-center gap-8 rounded-[28px] bg-gradient-to-r from-brand-dark via-brand to-[#8A6BF2] px-11 py-10 text-white shadow-[0_20px_40px_-20px_rgba(108,78,224,0.55)]">
          <div
            className="relative flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#fff 0% ${overallScore ?? 0}%, rgba(255,255,255,0.25) ${overallScore ?? 0}% 100%)`,
            }}
          >
            <div className="absolute inset-[9px] rounded-full bg-brand-dark" />
            <div className="relative z-10 text-center">
              <div className="text-[30px] font-extrabold leading-none">{overallScore ?? '—'}</div>
              <div className="mt-0.5 text-[11px] opacity-75">/ 100점</div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-serif text-[22px] font-bold">{headline(overallScore)}</div>
            <p className="m-0 max-w-[360px] whitespace-pre-line text-[13.5px] leading-relaxed text-[#E3DBFA]">
              {current.summaryText ?? '아직 AI 총평이 없어요.'}
            </p>
            <div className="mt-4 flex gap-5">
              <div className="text-xs text-[#DCD3FA]">
                <b className="block text-sm font-bold text-white">
                  {formatDuration(current.startedAt, current.endedAt)}
                </b>
                소요 시간
              </div>
              <div className="text-xs text-[#DCD3FA]">
                <b className="block text-sm font-bold text-white">
                  {answeredCount} / {questions.length}
                </b>
                답변 완료
              </div>
              <div className="text-xs text-[#DCD3FA]">
                <b className="block text-sm font-bold text-white">{followUpCount}개</b>꼬리질문
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3.5 text-[15px] font-bold text-ink">역량별 분석</div>
        <div className="mb-8 grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {traits.map((trait) => (
            <div key={trait.label} className="rounded-2xl border border-stroke bg-white p-[18px]">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{trait.label}</span>
                <span className="text-xs font-bold text-brand">
                  {trait.score === null ? '—' : `${Math.round(trait.score)}점`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card">
                <div className="h-full rounded-full bg-brand" style={{ width: `${trait.score ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3.5 text-[15px] font-bold text-ink">AI 총평</div>
        <div className="mb-8 rounded-2xl border border-stroke bg-white p-6">
          <div className="mb-3.5 flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-[#EAF7F0] text-[#2FA36B]">
              <i className="ti ti-thumb-up text-sm" aria-hidden="true" />
            </div>
            <p className="m-0 whitespace-pre-line pt-0.5 text-[13.5px] leading-relaxed text-[#3A3355]">
              {current.strengths ?? '아직 정리된 강점이 없어요.'}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-[#FBF1E3] text-[#D98A2B]">
              <i className="ti ti-alert-triangle text-sm" aria-hidden="true" />
            </div>
            <p className="m-0 whitespace-pre-line pt-0.5 text-[13.5px] leading-relaxed text-[#3A3355]">
              {current.weaknesses ?? '아직 정리된 보완점이 없어요.'}
            </p>
          </div>
        </div>

        <div className="mb-3.5 text-[15px] font-bold text-ink">질문별 리뷰</div>
        <div className="mb-9 flex flex-col gap-3.5">
          {questions.map((question) => {
            const isIntro = question.questionType === 'INTRO';
            const isFollowUp = question.parentQuestionId !== null;
            const answerText = finalAnswerText(question);
            const feedback = question.answers.find((a) => a.isFinal)?.feedbackText;
            return (
              <div key={question.questionId} className="rounded-2xl border border-stroke bg-white p-6">
                <div className="mb-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className={`mb-1 text-[11.5px] font-bold ${isIntro ? 'text-muted' : 'text-brand'}`}>
                      {isIntro ? '자기소개' : `질문 ${projectQuestionNumbers.get(question.questionId)}`}
                    </div>
                    <div className="text-sm font-semibold leading-relaxed text-ink">{question.questionText}</div>
                  </div>
                  {(isIntro || isFollowUp) && (
                    <span
                      className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${
                        isIntro ? 'bg-[#F4F2FA] text-muted' : 'bg-card text-brand'
                      }`}
                    >
                      {isIntro ? '자기소개' : '꼬리질문'}
                    </span>
                  )}
                </div>
                <div className="rounded-xl bg-[#FAF9FE] px-3.5 py-3 text-[13px] leading-relaxed text-muted">
                  {answerText ? `"${answerText}"` : '(답변 없음)'}
                </div>
                {feedback && (
                  <div className="mt-3 flex gap-2">
                    <i className="ti ti-sparkles mt-0.5 text-sm text-brand" aria-hidden="true" />
                    <p className="m-0 text-[13px] leading-relaxed text-[#3A3355]">{feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/interview/setup')}
            className="flex-1 rounded-xl border-[1.5px] border-stroke bg-white py-3.5 text-sm font-semibold text-[#3A3355]"
          >
            다시 풀어보기
          </button>
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] hover:bg-brand-dark"
          >
            마이페이지로
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          ※ AI 평가는 답변 텍스트를 기준으로 한 연습용 참고 피드백이에요. 발음이나 말하기 속도는 평가하지 않아요.
        </p>
      </div>
    </div>
  );
}
