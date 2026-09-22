import Navbar from '../components/Navbar';
import FeatureCard from '../components/FeatureCard';

export default function Home() {
  return (
    <div>
      <Navbar />

      <header className="px-[6vw] pb-2 pt-[7vw] text-center">
        <h1 className="mx-auto max-w-2xl font-sans text-3xl font-extrabold leading-snug tracking-tight text-ink md:text-4xl">
          스펙으로 준비하는 면접은
          <br />
          이제 그만
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          이력서 하나로 실전 같은 질문을 받아보세요
        </p>
      </header>

      <section className="mx-auto flex max-w-4xl gap-5 px-[6vw] pb-[7vw] pt-9">
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
    </div>
  );
}
