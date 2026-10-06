import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { getDummyQuestions } from '../../utils/interviewQuestions';
import { getInterviewHistoryItem } from '../../utils/interviewHistory';
import ErrorState from '../../components/ErrorState';

// TODO: 백엔드 연동 시 이 더미 데이터 대신 실제 채점/분석 결과를 API로 받아옵니다.
const DUMMY_OVERALL_SCORE = 82;
const DUMMY_TRAITS = [
  { label: '논리적 구성', score: 85 },
  { label: '답변 구체성', score: 78 },
  { label: '전달력', score: 80 },
];
const DUMMY_ANSWERS = [
  '면접 흐름 전체를 상태 관리 없이 구현하다가 데이터가 꼬이는 문제가 있었는데, Context API로 리팩토링해서 해결했습니다...',
  'Redux와 Context API를 두고 고민했는데, 프로젝트 규모상 러닝커브가 낮은 Context API를 선택했습니다...',
  '컴포넌트 분리 방식에 대해 의견이 갈렸을 때, 각자 장단점을 정리해서 회의를 통해 결정했습니다...',
];
const DUMMY_FEEDBACKS = [
  '문제 상황과 해결 과정을 순서대로 잘 설명했어요. 결과로 어떤 지표(속도, 버그 수 등)가 개선됐는지 덧붙이면 더 설득력 있을 거예요.',
  '대안을 비교하고 선택 이유를 설명한 점이 좋아요. 각 대안의 장단점을 한 문장씩 더 붙이면 비교 기준이 명확해질 거예요.',
  '갈등을 감정적으로 풀지 않고 근거 기반으로 조율한 점이 좋은 인상을 줘요. 최종 결정 이후 팀 반응이나 결과도 함께 언급해보세요.',
];
const DUMMY_QA_SCORES = [28, 26, 28];

function formatToday() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

interface InterviewResultProps {
  // true면 홈의 "샘플 보기"로 들어온 샘플 리포트입니다. (로그인·면접 기록 없이 더미 결과를 보여줘요)
  sample?: boolean;
}

export default function InterviewResult({ sample = false }: InterviewResultProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { data } = useInterviewSetup();

  // 마이페이지의 "다시보기"로 들어온 경우엔 그때 봤던 면접 기록을, 방금 면접을 마친 경우엔
  // 진행 중이던 설정(Context) 값을 사용합니다.
  const historyItem = getInterviewHistoryItem(id);
  const isReviewMode = Boolean(historyItem);

  const jobRole = sample ? '프론트엔드 개발자' : (historyItem?.jobRole ?? data.jobRole);
  const mode = sample ? 'practice' : (historyItem?.mode ?? data.mode);
  const questionCount = sample ? 3 : (historyItem?.questionCount ?? data.questionCount);
  const dateLabel = historyItem?.date ?? formatToday();
  const projectName = sample ? '샘플 프로젝트' : data.projectName;

  const questions = useMemo(
    () => getDummyQuestions(projectName, questionCount),
    [projectName, questionCount],
  );

  const modeLabel = mode === 'live' ? '실전면접' : '모의면접';

  // 다시보기(지난 면접)는 이미 분석이 끝난 결과라 로딩 없이 바로 보여주고,
  // 방금 면접을 마친 경우에만 AI 분석을 기다리는 로딩 화면을 잠깐 보여줍니다.
  // TODO: 백엔드 연동 시 setTimeout 대신 실제 분석 결과 API 응답을 기다렸다가 isLoading을 false로 바꿉니다.
  // 샘플 리포트도 분석을 기다릴 필요가 없어서 로딩 없이 바로 보여줍니다.
  const [isLoading, setIsLoading] = useState(!isReviewMode && !sample);

  useEffect(() => {
    if (isReviewMode || sample) return;
    const timer = setTimeout(() => setIsLoading(false), 1800);
    return () => clearTimeout(timer);
  }, [isReviewMode, sample]);

  const handleSaveResult = () => {
    // TODO: 백엔드 연동 시 이 결과를 저장하는 API를 호출합니다.
    navigate('/mypage');
  };

  // 다시보기 주소(:id)로 들어왔는데 해당 면접 기록을 찾지 못한 경우
  // TODO: 백엔드 연동 후에는 결과 조회 API가 실패했을 때도 이 화면(ErrorState)을 보여주세요.
  if (id && !historyItem) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="flex items-center justify-between border-b border-stroke bg-white px-10 py-[22px]">
          <Logo size="sm" to="/" />
        </div>
        <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
          <ErrorState
            title="결과를 불러오지 못했어요"
            description="해당 면접 기록을 찾을 수 없어요. 마이페이지에서 다시 선택해 주세요."
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="flex items-center justify-between border-b border-stroke bg-white px-10 py-[22px]">
          <Logo size="sm" to="/" />
        </div>

        <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-7 h-16 w-16 animate-spin rounded-full border-[3px] border-[#E2DEF5] border-t-brand" />
          <div className="mb-2 text-lg font-bold text-ink">AI가 답변을 분석하고 있어요</div>
          <p className="mb-8 max-w-[320px] text-sm leading-relaxed text-muted">
            답변 내용을 바탕으로 역량 점수와 피드백을 만들고 있어요. 잠시만 기다려주세요.
          </p>

          <div className="w-[300px] text-left">
            <div className="flex items-center gap-2.5 border-b border-dashed border-stroke py-2.5">
              <i className="ti ti-circle-check-filled text-base text-brand" aria-hidden="true" />
              <span className="text-[13px] text-[#3A3355]">답변 전사(STT) 완료</span>
            </div>
            <div className="flex items-center gap-2.5 border-b border-dashed border-stroke py-2.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E2DEF5] border-t-brand" />
              <span className="text-[13px] text-[#3A3355]">역량별 점수 산출 중</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <div className="h-4 w-4 rounded-full border-[1.5px] border-stroke" />
              <span className="text-[13px] text-muted">AI 총평 생성</span>
            </div>
          </div>

          <div className="mt-7 h-1.5 w-[300px] overflow-hidden rounded-full bg-card">
            <div className="h-full w-2/3 rounded-full bg-brand" />
          </div>
          <div className="mt-2 text-[11.5px] text-muted">약 5~10초 정도 소요돼요</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex items-center justify-between border-b border-stroke bg-white px-10 py-[22px]">
        <Logo size="sm" to="/" />
        {sample ? (
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-dark"
          >
            무료로 시작하기
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="rounded-lg bg-[#F4F2FA] px-3.5 py-2 text-xs font-semibold text-muted hover:text-ink"
          >
            마이페이지로
          </button>
        )}
      </div>

      <div className="mx-auto max-w-[760px] px-6 py-11">
        <div className="mb-3.5 flex items-center gap-2">
          <span className="rounded-full bg-card px-2.5 py-1 text-[11.5px] font-bold text-brand">
            {modeLabel}
          </span>
          {isReviewMode && (
            <span className="rounded-full bg-[#F4F2FA] px-2.5 py-1 text-[11.5px] font-bold text-muted">
              지난 면접 다시보기
            </span>
          )}
          {sample && (
            <span className="rounded-full bg-[#F4F2FA] px-2.5 py-1 text-[11.5px] font-bold text-muted">
              샘플 리포트
            </span>
          )}
          <span className="text-xs text-muted">
            {sample ? '' : `${dateLabel} · `}
            {jobRole} · 질문 {questions.length}개
          </span>
        </div>

        <div className="mb-7 flex items-center gap-8 rounded-[28px] border border-[#EDE8FA] bg-gradient-to-br from-white to-[#F6F2FF] px-11 py-10 text-ink shadow-[0_20px_40px_-28px_rgba(108,78,224,0.35)]">
          <div
            className="relative flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#6C4EE0 0% ${DUMMY_OVERALL_SCORE}%, #E9E3FB ${DUMMY_OVERALL_SCORE}% 100%)`,
            }}
          >
            <div className="absolute inset-[9px] rounded-full bg-white" />
            <div className="relative z-10 text-center">
              <div className="text-[30px] font-extrabold leading-none text-brand">{DUMMY_OVERALL_SCORE}</div>
              <div className="mt-0.5 text-[11px] text-muted">/ 100점</div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-serif text-[22px] font-bold">전반적으로 좋은 답변이었어요</div>
            <p className="m-0 max-w-[360px] text-[13.5px] leading-relaxed text-[#4A4266]">
              경험을 구체적인 사례로 풀어내는 능력이 돋보였어요. 다만 일부 답변에서 결론을 먼저
              말하는 구조를 연습하면 더 좋아질 것 같아요.
            </p>
            <div className="mt-4 flex gap-5">
              <div className="text-xs text-muted">
                <b className="block text-sm font-bold text-ink">8분 24초</b>소요 시간
              </div>
              <div className="text-xs text-muted">
                <b className="block text-sm font-bold text-ink">
                  {questions.length} / {questions.length}
                </b>
                답변 완료
              </div>
              <div className="text-xs text-muted">
                <b className="block text-sm font-bold text-ink">1개</b>꼬리질문
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3.5 text-[15px] font-bold text-ink">역량별 분석</div>
        <div className="mb-8 grid grid-cols-3 gap-3.5">
          {DUMMY_TRAITS.map((trait) => (
            <div key={trait.label} className="rounded-2xl border border-stroke bg-white p-[18px]">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{trait.label}</span>
                <span className="text-xs font-bold text-brand">{trait.score}점</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${trait.score}%` }}
                />
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
            <p className="m-0 pt-0.5 text-[13.5px] leading-relaxed text-[#3A3355]">
              프로젝트 경험을 설명할 때 문제 상황 → 시도한 방법 → 결과 순서로 구조화해서 이야기해
              이해하기 쉬웠어요.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] bg-[#FBF1E3] text-[#D98A2B]">
              <i className="ti ti-alert-triangle text-sm" aria-hidden="true" />
            </div>
            <p className="m-0 pt-0.5 text-[13.5px] leading-relaxed text-[#3A3355]">
              일부 답변이 다소 길어지는 경향이 있었어요. 핵심 결론을 먼저 말하고 세부 설명을
              덧붙이는 두괄식 구조를 연습해보세요.
            </p>
          </div>
        </div>

        <div className="mb-3.5 text-[15px] font-bold text-ink">질문별 리뷰</div>
        <div className="mb-9 flex flex-col gap-3.5">
          {questions.map((question, index) => (
            <div key={index} className="rounded-2xl border border-stroke bg-white p-6">
              <div className="mb-3.5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 text-[11.5px] font-bold text-brand">질문 {index + 1}</div>
                  <div className="text-sm font-semibold leading-relaxed text-ink">{question}</div>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-xs font-bold text-brand">
                  {DUMMY_QA_SCORES[index] ?? 27} / 30
                </span>
              </div>
              <div className="mb-3 rounded-xl bg-[#FAF9FE] px-3.5 py-3 text-[13px] leading-relaxed text-muted">
                "{DUMMY_ANSWERS[index] ?? DUMMY_ANSWERS[0]}"
              </div>
              <div className="flex gap-2">
                <i className="ti ti-sparkles mt-0.5 text-sm text-brand" aria-hidden="true" />
                <p className="m-0 text-[13px] leading-relaxed text-[#3A3355]">
                  {DUMMY_FEEDBACKS[index] ?? DUMMY_FEEDBACKS[0]}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(sample ? '/' : '/interview/setup')}
            className="flex-1 rounded-xl border-[1.5px] border-stroke bg-white py-3.5 text-sm font-semibold text-[#3A3355]"
          >
            {sample ? '홈으로' : '다시 풀어보기'}
          </button>
          {sample ? (
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] hover:bg-brand-dark"
            >
              무료로 시작하기
            </button>
          ) : isReviewMode ? (
            <button
              type="button"
              onClick={() => navigate('/mypage')}
              className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] hover:bg-brand-dark"
            >
              마이페이지로
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveResult}
              className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] hover:bg-brand-dark"
            >
              결과 저장
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          {sample
            ? '※ 실제 결과가 아닌 샘플 리포트예요. 가입하면 내 답변으로 만들어진 리포트를 받아볼 수 있어요.'
            : '※ 백엔드 연동 전이라 위 점수·피드백은 모두 더미 데이터입니다.'}
        </p>
      </div>
    </div>
  );
}
