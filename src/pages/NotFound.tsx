import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex items-center justify-between border-b border-stroke bg-white px-12 py-[22px]">
        <Logo size="sm" to="/" />
      </div>
      <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-5 py-10 text-center">
        <div className="mb-3.5 bg-gradient-to-br from-brand-dark to-[#8F6FF0] bg-clip-text font-serif text-[84px] font-bold leading-none tracking-tight text-transparent">
          404
        </div>
        <div className="mb-2 text-[19px] font-extrabold text-ink">페이지를 찾을 수 없어요</div>
        <p className="mb-6 text-[13.5px] leading-relaxed text-muted">
          주소가 바뀌었거나 없는 페이지예요.
          <br />
          아래 버튼으로 돌아가 주세요.
        </p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-stroke bg-white px-[22px] py-3 text-[13.5px] font-bold text-[#3A3355]"
          >
            <i className="ti ti-arrow-left text-base" aria-hidden="true" />
            이전 페이지
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-[22px] py-3 text-[13.5px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] hover:bg-brand-dark"
          >
            <i className="ti ti-home text-base" aria-hidden="true" />
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
