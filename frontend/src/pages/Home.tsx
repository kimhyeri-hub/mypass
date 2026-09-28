import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FeatureCard from '../components/FeatureCard';

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

const features = [
  {
    icon: 'ti-message-2',
    gradient: 'from-brand to-[#8F6FF0]',
    title: '모의면접 (텍스트)',
    description: '내 속도에 맞춰 글로 답변을 정리하며 연습할 수 있어요.',
  },
  {
    icon: 'ti-headphones',
    gradient: 'from-[#2FA36B] to-[#5FC996]',
    title: '실전면접 (음성)',
    description: 'AI가 음성으로 질문하고, 웹캠 앞에서 실제처럼 답변해요.',
  },
  {
    icon: 'ti-chart-donut',
    gradient: 'from-[#D98A2B] to-[#F0B45C]',
    title: 'AI 역량 분석',
    description: '논리·구체성·전달력을 점수화하고 개선 포인트를 짚어줘요.',
  },
  {
    icon: 'ti-history',
    gradient: 'from-[#4E7FE0] to-[#6FA6F0]',
    title: '면접 기록 관리',
    description: '지난 면접을 언제든 다시보기하며 성장 과정을 확인해요.',
  },
];

export default function Home() {
  return (
    <div>
      <Navbar />

      <header className="px-[6vw] pb-2 pt-[52px] text-center">
        <h1 className="mx-auto max-w-[600px] font-sans text-[32px] font-extrabold leading-snug tracking-tight text-ink">
          스펙으로 준비하는 면접은
          <br />
          이제 그만
        </h1>
        <p className="mx-auto mt-3.5 max-w-[420px] text-[15px] leading-relaxed text-muted">
          이력서 하나로 실전 같은 질문을 받아보세요
        </p>
      </header>

      <section className="mx-auto flex max-w-[760px] justify-center gap-4 px-[6vw] pb-11 pt-[30px]">
        <FeatureCard
          title="이력서 등록은 이제 그만 고민하지 마세요"
          description="이력서를 올리면 나에게 맞는 질문이 도착해요."
          ctaLabel="이력서 올리기"
          ctaTo="/signup"
        />
        <FeatureCard
          title={'간단한 전공 정보로\n맞춤 질문 진단'}
          description="전공을 알려주면 딱 맞는 면접을 준비해드려요."
          ctaLabel="모의면접 시작하기"
          ctaTo="/login"
          variant="outline"
        />
      </section>

      {/* 작동 방식 */}
      <section className="mx-auto max-w-[920px] px-[6vw] py-9">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-[18px] border border-stroke bg-white p-[22px_18px] text-center"
            >
              <span className="mb-2.5 block font-serif text-xs font-bold text-brand">
                {step.number}
              </span>
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-card text-lg text-brand">
                <i className={`ti ${step.icon}`} aria-hidden="true" />
              </div>
              <h3 className="mb-1.5 text-sm font-bold text-ink">{step.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 핵심 기능 소개 */}
      <section className="mx-auto max-w-[920px] px-[6vw] pb-9 pt-1">
        <div className="mx-auto mb-[30px] max-w-[460px] text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[11.5px] font-bold text-brand">
            <i className="ti ti-star text-sm" aria-hidden="true" />
            핵심 기능
          </span>
          <h2 className="text-[23px] font-extrabold tracking-tight text-ink">MYPASS가 다른 점</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            모의면접부터 실전 훈련, 결과 분석까지 한 번에 해결해요.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 rounded-[18px] border border-stroke bg-white p-5"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${feature.gradient}`}
              >
                <i className={`ti ${feature.icon}`} aria-hidden="true" />
              </div>
              <div>
                <h3 className="mb-1 text-[13.5px] font-bold text-ink">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 하단 최종 CTA */}
      <section className="mx-auto max-w-[920px] px-[6vw] pb-16 pt-2">
        <div className="rounded-[24px] bg-gradient-to-r from-brand-dark via-brand to-[#8A6BF2] px-[6vw] py-10 text-center text-white shadow-[0_20px_40px_-20px_rgba(108,78,224,0.55)]">
          <h2 className="mb-2.5 font-serif text-[23px] font-bold">지금, 실전처럼 준비해보세요</h2>
          <p className="mb-5 text-[13px] text-[#E3DBFA]">
            이력서 한 장이면 충분해요. 가입은 1분이면 끝나요.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-[26px] py-3.5 text-sm font-bold text-brand-dark shadow-[0_10px_20px_-8px_rgba(0,0,0,0.25)] hover:bg-[#F6F3FE]"
          >
            <i className="ti ti-arrow-right text-base" aria-hidden="true" />
            무료로 시작하기
          </Link>
          <p className="mt-3 text-[11.5px] text-[#DCD3FA]">신용카드 등록 없이 바로 이용 가능해요</p>
        </div>
      </section>
    </div>
  );
}
