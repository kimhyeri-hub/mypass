interface InterviewRowProps {
  title: string;
  date: string;
  questionCount: number;
  onReview?: () => void;
  isLast?: boolean;
}

export default function InterviewRow({
  title,
  date,
  questionCount,
  onReview,
  isLast = false,
}: InterviewRowProps) {
  return (
    <div
      className={`flex items-center gap-3.5 px-5 py-4 ${isLast ? '' : 'border-b border-stroke'}`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-card text-brand">
        <i className="ti ti-message-2 text-base" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-muted">{date}</div>
      </div>
      <span className="mr-1 whitespace-nowrap rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-brand">
        질문 {questionCount}개
      </span>
      <button
        onClick={onReview}
        className="whitespace-nowrap rounded-lg bg-[#F4F2FA] px-3.5 py-2 text-xs font-semibold text-muted hover:text-ink"
      >
        다시보기
      </button>
    </div>
  );
}
