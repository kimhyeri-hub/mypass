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
      className={`flex items-center justify-between py-3.5 ${
        isLast ? '' : 'border-b border-[#F0EEFB]'
      }`}
    >
      <div>
        <div className="text-sm text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-[#98A2B3]">
          {date} · 질문 {questionCount}개
        </div>
      </div>
      <button onClick={onReview} className="text-xs text-brand">
        다시보기
      </button>
    </div>
  );
}
