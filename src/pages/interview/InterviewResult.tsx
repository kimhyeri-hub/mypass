import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import { getDummyQuestions } from '../../utils/interviewQuestions';

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

export default function InterviewResult() {
  const navigate = useNavigate();
  const { data } = useInterviewSetup();

  const questions = useMemo(
    () => getDummyQuestions(data.projectName, data.questionCount),
    [data.projectName, data.questionCount],
  );

  const modeLabel = data.mode === 'live' ? '실전면접' : '모의면접';

  const handleSaveResult = () => {
    // TODO: 백엔드 연동 시 이 결과를 저장하는 API를 호출합니다.
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex items-center justify-between border-b border-stroke bg-white px-10 py-[22px]">
        <Logo size="sm" to="/" />
        <button
          type="button"
          onClick={() => navigate('/mypage')}
          className="rounded-lg bg-[#F4F2FA] px-3.5 py-2 text-xs font-semibold text-muted hover:text-ink"
        >
          마이페이지로
        </button>
      </div>

      <div className="mx-auto max-w-[760px] px-6 py-11">
        <div className="mb-3.5 flex items-center gap-2">
          <span className="rounded-full bg-card px-2.5 py-1 text-[11.5px] font-bold text-brand">
            {modeLabel}
          </span>
          <span className="text-xs text-muted">
            {formatToday()} · {data.jobRole} · 질문 {questions.length}개
          </span>
        </div>

        <div className="mb-7 flex items-center gap-8 rounded-[28px] bg-gradient-to-r from-brand-dark via-brand to-[#8A6BF2] px-11 py-10 text-white shadow-[0_20px_40px_-20px_rgba(108,78,224,0.55)]">
          <div
            className="relative flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#fff 0% ${DUMMY_OVERALL_SCORE}%, rgba(255,255,255,0.25) ${DUMMY_OVERALL_SCORE}% 100%)`,
            }}
          >
            <div className="absolute inset-[9px] rounded-full bg-brand-dark" />
            <div className="relative z-10 text-center">
              <div className="text-[30px] font-extrabold leading-none">{DUMMY_OVERALL_SCORE}</div>
              <div className="mt-0.5 text-[11px] opacity-75">/ 100점</div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-serif text-[22px] font-bold">전반적으로 좋은 답변이었어요</div>
            <p className="m-0 max-w-[360px] text-[13.5px] leading-relaxed text-[#E3DBFA]">
              경험을 구체적인 사례로 풀어내는 능력이 돋보였어요. 다만 일부 답변에서 결론을 먼저
              말하는 구조를 연습하면 더 좋아질 것 같아요.
            </p>
            <div className="mt-4 flex gap-5">
              <div className="text-xs text-[#DCD3FA]">
                <b className="block text-sm font-bold text-white">8분 24초</b>소요 시간
              </div>
              <div className="text-xs text-[#DCD3FA]">
                <b className="block text-sm font-bold text-white">
                  {questions.length} / {questions.length}
                </b>
                답변 완료
              </div>
              <div className="text-xs text-[#DCD3FA]">
                <b className="block text-sm font-bold text-white">1개</b>꼬리질문
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
            onClick={() => navigate('/interview/setup')}
            className="flex-1 rounded-xl border-[1.5px] border-stroke bg-white py-3.5 text-sm font-semibold text-[#3A3355]"
          >
            다시 풀어보기
          </button>
          <button
            type="button"
            onClick={handleSaveResult}
            className="flex-1 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] hover:bg-brand-dark"
          >
            결과 저장
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          ※ 백엔드 연동 전이라 위 점수·피드백은 모두 더미 데이터입니다.
        </p>
      </div>
    </div>
  );
}
