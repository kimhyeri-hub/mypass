interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

// 목록처럼 화면 일부 영역만 실패했을 때 쓰는 작은 에러 배너
export default function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[#F3D7DC] bg-[#FDEEEF] px-4 py-3.5">
      <i className="ti ti-wifi-off text-xl text-[#B5495A]" aria-hidden="true" />
      <div className="flex-1 text-[13px] font-semibold text-[#8A3447]">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[9px] bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#B5495A]"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
