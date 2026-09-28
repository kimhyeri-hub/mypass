interface ResumeCardProps {
  title: string;
  uploadedDate: string;
}

export function ResumeCard({ title, uploadedDate }: ResumeCardProps) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-stroke bg-white p-5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-card text-brand">
        <i className="ti ti-file-text text-base" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-muted">{uploadedDate} 업로드</div>
      </div>
    </div>
  );
}

interface AddResumeCardProps {
  onClick?: () => void;
}

export function AddResumeCard({ onClick }: AddResumeCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-stroke p-5 text-sm font-semibold text-muted hover:border-brand hover:text-brand"
    >
      <i className="ti ti-plus text-lg text-brand" aria-hidden="true" />
      새 이력서 추가
    </button>
  );
}
