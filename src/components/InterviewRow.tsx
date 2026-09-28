interface InterviewRowProps {
  title: string;
  date: string;
  questionCount: number;
  mode?: 'practice' | 'live';
  score?: number;
  onReview?: () => void;
  isLast?: boolean;
}

export default function InterviewRow({
  title,
  date,
  questionCount,
  mode,
  score,
  onReview,
  isLast = false,
}: InterviewRowProps) {
  return (
    <div
      className={`flex items-center gap-3.5 px-5 py-4 ${isLast ? '' : 'border-b border-stroke'}`}
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] text-base ${
          mode === 'live' ? 'bg-[#EAF7F0] text-[#2FA36B]' : 'bg-card text-brand'
        }`}
      >
        <i className={`ti ${mode === 'live' ? 'ti-headphones' : 'ti-message-2'}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          {mode && (
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                mode === 'live' ? 'bg-[#EAF7F0] text-[#2FA36B]' : 'bg-card text-brand'
              }`}
            >
              {mode === 'live' ? '실전면접' : '모의면접'}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {date} · 질문 {questionCount}개
        </div>
      </div>
      {typeof score === 'number' && (
        <div className="mr-1 flex-shrink-0 text-center">
          <div className="text-sm font-bold text-brand">{score}점</div>
          <div className="text-[10px] text-muted">종합 점수</div>
        </div>
      )}
      <button
        onClick={onReview}
        className="flex-shrink-0 whitespace-nowrap rounded-lg bg-[#F4F2FA] px-3.5 py-2 text-xs font-semibold text-muted hover:text-ink"
      >
        다시보기
      </button>
    </div>
  );
}
