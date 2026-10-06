import { useNavigate } from 'react-router-dom';

interface ErrorStateProps {
  title: string;
  description?: string;
  code?: string | number;
  onRetry?: () => void;
  // 기본값은 마이페이지로 이동하는 버튼이에요. 숨기려면 false를 넘겨주세요.
  showHomeButton?: boolean;
}

// 화면 전체에 필요한 데이터를 못 불러왔을 때 쓰는 공통 에러 화면 (결과 조회 실패, 세션 시작 실패 등)
export default function ErrorState({
  title,
  description = '네트워크 연결이 불안정하거나 서버에 문제가 생겼을 수 있어요. 잠시 후 다시 시도해 주세요.',
  code,
  onRetry,
  showHomeButton = true,
}: ErrorStateProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#FDEEEF] text-[26px] text-[#B5495A]">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
      </div>
      <div className="mb-2 text-[17px] font-extrabold text-ink">{title}</div>
      <p className="mb-6 max-w-[340px] text-[13.5px] leading-relaxed text-muted">{description}</p>
      <div className="flex gap-2.5">
        {showHomeButton && (
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-stroke bg-white px-[22px] py-3 text-[13.5px] font-bold text-[#3A3355]"
          >
            <i className="ti ti-home text-base" aria-hidden="true" />
            마이페이지로
          </button>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-[22px] py-3 text-[13.5px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(108,78,224,0.6)] hover:bg-brand-dark"
          >
            <i className="ti ti-refresh text-base" aria-hidden="true" />
            다시 시도하기
          </button>
        )}
      </div>
      {code !== undefined && <div className="mt-[18px] text-[11px] text-[#B6AED8]">오류 코드: {code}</div>}
    </div>
  );
}
