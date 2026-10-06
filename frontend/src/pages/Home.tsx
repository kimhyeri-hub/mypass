import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Reveal from '../components/Reveal';
import HeroChatPreview from '../components/HeroChatPreview';
import ReportPreviewSection from '../components/ReportPreviewSection';

const steps = [
  {
    number: 'STEP 01',
    icon: 'ti-file-upload',
    title: '이력서 업로드',
    description: '이력서와 프로젝트 자료를 올리면 AI가 내용을 분석해요.',
  },
  {
    number: 'STEP 02',
    icon: 'ti-sparkles',
    title: '맞춤 질문 생성',
    description: '경험과 전공에 맞는 예상 질문을 AI가 자동으로 만들어줘요.',
  },
  {
    number: 'STEP 03',
    icon: 'ti-microphone-2',
    title: '실전처럼 면접 & 분석',
    description: '텍스트 또는 음성으로 답변하고, AI 피드백까지 바로 받아봐요.',
  },
];

export default function Home() {
  const scrollToHow = () => {
    document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="overflow-x-hidden">
      <Navbar />

      {/* 히어로: 왼쪽 문구 + 오른쪽 면접 진행 미리보기 */}
      <header className="relative isolate mx-auto grid max-w-[1180px] items-center gap-12 px-[6vw] pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div
          className="pointer-events-none absolute -left-20 -top-10 -z-10 h-[380px] w-[380px] animate-float rounded-full bg-[#CFC3FA] opacity-45 blur-[70px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-10 -z-10 h-[320px] w-[320px] animate-float rounded-full bg-[#E4DBFF] opacity-45 blur-[70px]"
          style={{ animationDelay: '-6s' }}
          aria-hidden="true"
        />

        <div className="text-center lg:text-left">
          <span
            className="mb-5 inline-flex animate-rise items-center gap-1.5 rounded-full bg-card px-3.5 py-[7px] text-[13px] font-bold text-brand"
          >
            <i className="ti ti-sparkles text-sm" aria-hidden="true" />
            AI 모의면접
          </span>
          <h1
            className="animate-rise font-sans text-[34px] font-extrabold leading-snug tracking-tight text-ink md:text-[44px]"
            style={{ animationDelay: '0.1s' }}
          >
            스펙으로 준비하는 면접은
            <br />
            <em className="not-italic text-brand">이제 그만</em>
          </h1>
          <p
            className="mt-5 animate-rise text-[15px] leading-relaxed text-muted md:text-[17px]"
            style={{ animationDelay: '0.25s' }}
          >
            이력서 하나로 실전 같은 질문을 받아보세요.
            <br />
            내 경험을 읽고 꼬리질문까지 던지는 AI와 연습해요.
          </p>
          <div
            className="mt-8 flex animate-rise flex-wrap justify-center gap-3 lg:justify-start"
            style={{ animationDelay: '0.4s' }}
          >
            <Link
              to="/signup"
              className="rounded-xl bg-brand px-[26px] py-[15px] text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_10px_24px_-10px_rgba(108,78,224,0.6)]"
            >
              무료로 시작하기
            </Link>
            <button
              type="button"
              onClick={scrollToHow}
              className="rounded-xl border-[1.5px] border-stroke bg-white px-[26px] py-[15px] text-[15px] font-bold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              작동 방식 보기
            </button>
          </div>
        </div>

        <HeroChatPreview />
      </header>

      {/* 작동 방식 */}
      <section id="how" className="mx-auto max-w-[920px] px-[6vw] py-16">
        <Reveal>
          <div className="mx-auto mb-[30px] max-w-[460px] text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[11.5px] font-bold text-brand">
              <i className="ti ti-route-2 text-sm" aria-hidden="true" />
              작동 방식
            </span>
            <h2 className="text-[23px] font-extrabold tracking-tight text-ink">3단계면 준비 끝</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              복잡한 설정 없이, 이력서 하나로 나만의 면접이 만들어져요.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 150}>
              <div className="group h-full rounded-[18px] border border-stroke bg-white p-[22px_18px] text-center transition-all duration-300 hover:-translate-y-2 hover:border-[#CFC3FA] hover:shadow-[0_24px_40px_-28px_rgba(108,78,224,0.5)]">
                <span className="mb-2.5 block font-serif text-xs font-bold text-brand">
                  {step.number}
                </span>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-card text-lg text-brand transition-all duration-300 group-hover:-rotate-6 group-hover:scale-105 group-hover:bg-brand group-hover:text-white">
                  <i className={`ti ${step.icon}`} aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 text-sm font-bold text-ink">{step.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 분석 리포트 미리보기 */}
      <ReportPreviewSection />

      {/* 하단 최종 CTA */}
      <section className="mx-auto max-w-[760px] px-[6vw] pb-14 pt-0">
        <Reveal>
          <div
            className="mx-auto flex max-w-[600px] items-center gap-4 rounded-[18px] border-[1.5px] border-transparent bg-white p-[12px_16px]"
            style={{
              backgroundImage:
                'linear-gradient(#fff, #fff), linear-gradient(90deg, #CFC3FA, #9EE4D2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <div className="flex h-[42px] w-[62px] flex-shrink-0 items-center justify-center rounded-[9px] bg-card text-lg text-brand">
              <i className="ti ti-sparkles" aria-hidden="true" />
            </div>
            <div className="flex-1 text-sm font-bold text-ink">
              지금, 실전처럼 준비해보세요
              <span className="mt-0.5 block text-xs font-normal text-muted">
                이력서 한 장이면 충분해요. 가입은 1분이면 끝나요.
              </span>
            </div>
            <Link
              to="/signup"
              className="whitespace-nowrap rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              무료로 시작하기
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
