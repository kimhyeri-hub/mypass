import { useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Link } from 'react-router-dom';
import Reveal from './Reveal';
import { useVisibleLoop } from '../hooks/useVisibleLoop';
import { sleep, tween, typeText } from '../utils/motion';

// 결과 화면(InterviewResult)이 실제로 보여주는 항목을 홈에서 미리 소개하는 섹션입니다.
// 카드마다 화면에 보이는 동안 애니메이션이 반복 재생돼요.
// 아래 점수와 문구는 모두 예시이며, 실제 결과 화면의 항목이 바뀌면 함께 맞춰주세요.

function Caret() {
  return <span className="animate-blink">|</span>;
}

function CardFrame({
  innerRef,
  title,
  description,
  children,
}: {
  innerRef: RefObject<HTMLDivElement>;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={innerRef}
      className="h-full overflow-hidden rounded-3xl border border-stroke/70 bg-white shadow-[0_16px_40px_-28px_rgba(30,18,64,0.35)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_48px_-28px_rgba(108,78,224,0.45)]"
    >
      <div className="flex h-[190px] items-center justify-center overflow-hidden bg-gradient-to-b from-[#FAF8FF] to-[#F1ECFF]">
        {children}
      </div>
      <div className="px-6 pb-6 pt-5">
        <h3 className="mb-1.5 text-base font-bold text-ink">{title}</h3>
        <p className="text-[12.5px] leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

/* 1. 종합 점수 */
const RING_LENGTH = 2 * Math.PI * 46;
const HEADLINE = '전반적으로 좋은 답변이었어요';
const HEAD_SUB = '경험을 사례로 풀어내는 능력이 돋보였어요';

function ScoreCard() {
  const [score, setScore] = useState(0);
  const [headline, setHeadline] = useState('');
  const [headSub, setHeadSub] = useState('');
  const [chips, setChips] = useState(0);
  const [burstKey, setBurstKey] = useState(0);

  const ref = useVisibleLoop<HTMLDivElement>(async (alive) => {
    while (alive()) {
      setScore(0);
      setHeadline('');
      setHeadSub('');
      setChips(0);
      await sleep(500);
      await tween(0, 82, 1700, (v) => setScore(Math.round(v)), alive);
      if (!alive()) return;
      setBurstKey((k) => k + 1);
      await typeText(HEADLINE, 45, setHeadline, alive);
      await typeText(HEAD_SUB, 30, setHeadSub, alive);
      if (!alive()) return;
      setChips(1);
      await sleep(250);
      setChips(2);
      await sleep(3200);
    }
  });

  return (
    <CardFrame
      innerRef={ref}
      title="종합 점수와 한 줄 총평"
      description="면접 전체를 100점 만점으로 요약하고, 소요 시간과 꼬리질문 수도 함께 보여줘요"
    >
      <div className="flex w-[310px] items-center gap-[18px]">
        <div className="relative h-[104px] w-[104px] flex-shrink-0">
          <svg viewBox="0 0 104 104" className="h-[104px] w-[104px] -rotate-90">
            <circle cx="52" cy="52" r="46" fill="none" stroke="#E4DBFF" strokeWidth="10" />
            <circle
              cx="52"
              cy="52"
              r="46"
              fill="none"
              stroke="#6C4EE0"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - score / 100)}
            />
          </svg>
          {burstKey > 0 && (
            <span
              key={burstKey}
              className="absolute -inset-1.5 animate-burst rounded-full border-2 border-brand"
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[28px] font-extrabold leading-none text-ink">
            {score}
            <small className="mt-[3px] text-[10px] font-semibold text-muted">/ 100점</small>
          </div>
        </div>
        <div className="text-xs leading-relaxed text-ink">
          <b className="mb-1 block min-h-[21px] text-sm">{headline}</b>
          <span className="block min-h-[38px]">{headSub}</span>
          <div className="mt-1 flex gap-1.5">
            {['8분 24초', '꼬리질문 1개'].map((label, index) => (
              <span
                key={label}
                className={`rounded-lg border border-stroke bg-white px-2 py-[3px] text-[10.5px] text-muted transition-all duration-500 ${
                  chips > index ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </CardFrame>
  );
}

/* 2. 역량별 분석 */
const TRAITS = [
  { label: '논리적 구성', score: 85 },
  { label: '답변 구체성', score: 78 },
  { label: '전달력', score: 80 },
];

function TraitCard() {
  const [values, setValues] = useState<number[]>(TRAITS.map(() => 0));
  const [shine, setShine] = useState<number[]>(TRAITS.map(() => 0));

  const setAt = (index: number, value: number) =>
    setValues((prev) => prev.map((v, i) => (i === index ? value : v)));

  const ref = useVisibleLoop<HTMLDivElement>(async (alive) => {
    while (alive()) {
      setValues(TRAITS.map(() => 0));
      await sleep(500);
      await Promise.all(
        TRAITS.map(async (trait, index) => {
          await sleep(index * 280);
          await tween(0, trait.score, 1300, (v) => setAt(index, Math.round(v)), alive);
          if (alive()) setShine((prev) => prev.map((n, i) => (i === index ? n + 1 : n)));
        }),
      );
      await sleep(3200);
    }
  });

  return (
    <CardFrame
      innerRef={ref}
      title="역량별 분석"
      description="논리적 구성, 답변 구체성, 전달력을 나눠서 점수로 보여줘요"
    >
      <div className="flex w-[310px] flex-col gap-3">
        {TRAITS.map((trait, index) => (
          <div key={trait.label} className="flex items-center gap-2.5 text-[11.5px] font-semibold">
            <span className="w-[74px] text-ink">{trait.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E9E3FB]">
              <div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#8E73F0] to-brand"
                style={{ width: `${values[index]}%` }}
              >
                {shine[index] > 0 && (
                  <span
                    key={shine[index]}
                    className="absolute inset-0 animate-shine bg-gradient-to-r from-transparent via-white/55 to-transparent"
                  />
                )}
              </div>
            </div>
            <b className="w-7 text-right text-brand">{values[index]}</b>
          </div>
        ))}
      </div>
    </CardFrame>
  );
}

/* 3. AI 총평 */
const GOOD_TEXT = '문제 상황 → 해결 방법 → 결과 순서로 구조화해서 이해하기 쉬웠어요';
const WARN_TEXT = '답변이 길어지는 경향이 있어요. 결론부터 말하는 두괄식을 연습해 보세요';

function SummaryCard() {
  const [good, setGood] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const ref = useVisibleLoop<HTMLDivElement>(async (alive) => {
    while (alive()) {
      setGood(null);
      setWarn(null);
      await sleep(500);
      setGood('');
      await typeText(GOOD_TEXT, 28, setGood, alive);
      await sleep(500);
      if (!alive()) return;
      setWarn('');
      await typeText(WARN_TEXT, 28, setWarn, alive);
      await sleep(3000);
    }
  });

  const rows = [
    { icon: 'ti-thumb-up', tone: 'bg-[#EAF7F0] text-[#2FA36B]', text: good, full: GOOD_TEXT },
    { icon: 'ti-alert-triangle', tone: 'bg-[#FBF1E3] text-[#D98A2B]', text: warn, full: WARN_TEXT },
  ];

  return (
    <CardFrame
      innerRef={ref}
      title="AI 총평: 잘한 점과 보완할 점"
      description="이번 면접에서 칭찬할 점과 다음에 고치면 좋을 점을 짚어 드려요"
    >
      <div className="flex w-[310px] flex-col gap-2.5">
        {rows.map((row) => (
          <div
            key={row.icon}
            className={`flex min-h-[62px] items-start gap-2.5 rounded-[13px] border border-stroke bg-white px-3 py-[11px] text-xs leading-relaxed shadow-[0_8px_18px_-14px_rgba(30,18,64,0.4)] transition-all duration-500 ${
              row.text !== null ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
            }`}
          >
            <div
              className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg text-sm ${row.tone}`}
            >
              <i className={`ti ${row.icon}`} aria-hidden="true" />
            </div>
            <div className="text-ink">
              {row.text}
              {row.text !== null && row.text.length < row.full.length && <Caret />}
            </div>
          </div>
        ))}
      </div>
    </CardFrame>
  );
}

/* 4. 질문별 리뷰 */
const QA = [
  {
    q: '가장 구현하기 어려웠던 화면이나 기능은?',
    a: '면접 흐름 전체를 상태 관리 없이 구현하다가 데이터가 꼬였고, Context API로 해결했습니다...',
    s: 28,
    f: '결과로 어떤 지표가 개선됐는지 덧붙이면 더 설득력 있어요',
  },
  {
    q: 'Redux 대신 Context API를 고른 이유는?',
    a: '프로젝트 규모상 러닝커브가 낮은 Context API를 선택했습니다...',
    s: 26,
    f: '각 대안의 장단점을 한 문장씩 더하면 더 좋아요',
  },
  {
    q: '팀원과 의견이 달랐을 때 어떻게 해결했나요?',
    a: '각자 장단점을 정리해서 회의를 통해 결정했습니다...',
    s: 28,
    f: '최종 결정 이후 팀 반응이나 결과도 함께 언급해보세요',
  },
];

function QuestionCard() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [feedbackOn, setFeedbackOn] = useState(false);

  const ref = useVisibleLoop<HTMLDivElement>(async (alive) => {
    let i = 0;
    while (alive()) {
      const item = QA[i];
      setIndex(i);
      setAnswer('');
      setScore(0);
      setFeedbackOn(false);
      await sleep(400);
      await typeText(`"${item.a}"`, 22, setAnswer, alive);
      await tween(0, item.s, 700, (v) => setScore(Math.round(v)), alive);
      if (!alive()) return;
      setFeedbackOn(true);
      await sleep(2600);
      i = (i + 1) % QA.length;
    }
  });

  const current = QA[index];
  const fullAnswer = `"${current.a}"`;

  return (
    <CardFrame
      innerRef={ref}
      title="질문별 리뷰"
      description="질문마다 내 답변과 점수, 맞춤 피드백을 확인하고 다시 복습할 수 있어요"
    >
      <div className="w-[310px]">
        <div className="mb-2 flex gap-1.5">
          {QA.map((_, i) => (
            <span
              key={i}
              className={`rounded-full border px-2.5 py-[3px] text-[10.5px] font-bold transition-colors duration-300 ${
                i === index
                  ? 'border-brand bg-brand text-white'
                  : 'border-stroke bg-white text-muted'
              }`}
            >
              질문 {i + 1}
            </span>
          ))}
        </div>
        <div className="min-h-[134px] rounded-[14px] border border-stroke bg-white px-3.5 py-[13px] text-[11.5px] leading-relaxed shadow-[0_10px_24px_-14px_rgba(30,18,64,0.35)]">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div className="flex-1 font-bold text-ink">{current.q}</div>
            <span className="whitespace-nowrap rounded-full bg-card px-[9px] py-0.5 text-[10.5px] font-bold text-brand">
              {score} / 30
            </span>
          </div>
          <div className="mb-[7px] min-h-[52px] rounded-[9px] bg-[#FAF9FE] px-[9px] py-[7px] text-muted">
            {answer}
            {answer.length > 0 && answer.length < fullAnswer.length && <Caret />}
          </div>
          <div
            className={`flex gap-1.5 text-ink transition-opacity duration-500 ${
              feedbackOn ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <i className="ti ti-sparkles flex-shrink-0 text-brand" aria-hidden="true" />
            <span>{current.f}</span>
          </div>
        </div>
      </div>
    </CardFrame>
  );
}

export default function ReportPreviewSection() {
  return (
    <section className="relative mx-auto max-w-[960px] px-[6vw] pb-24 pt-10">
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 40%, rgba(108,78,224,0.10), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <Reveal>
        <div className="mx-auto mb-10 max-w-[520px] text-center">
          <h2 className="text-[26px] font-extrabold leading-snug tracking-tight text-ink">
            면접이 끝나면,
            <br />
            이런 분석 리포트를 받아요
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
            내 답변을 글로 옮겨 점수와 피드백으로 정리해 드려요
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Reveal>
          <ScoreCard />
        </Reveal>
        <Reveal delay={150}>
          <TraitCard />
        </Reveal>
        <Reveal>
          <SummaryCard />
        </Reveal>
        <Reveal delay={150}>
          <QuestionCard />
        </Reveal>
      </div>

      <Reveal>
        <div
          className="mx-auto mt-7 flex max-w-[520px] items-center gap-4 rounded-[18px] border-[1.5px] border-transparent bg-white p-[12px_16px]"
          style={{
            backgroundImage:
              'linear-gradient(#fff, #fff), linear-gradient(90deg, #CFC3FA, #9EE4D2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <div className="flex h-[42px] w-[62px] items-center justify-center rounded-[9px] bg-card text-lg text-[#B6AED8]">
            <i className="ti ti-lock" aria-hidden="true" />
          </div>
          <div className="flex-1 text-sm font-bold text-ink">
            전체 리포트가 궁금하다면?
            <span className="mt-0.5 block text-xs font-normal text-muted">
              로그인하면 실제 리포트 화면을 볼 수 있어요
            </span>
          </div>
          <Link
            to="/login"
            className="whitespace-nowrap rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            로그인하고 보기
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
