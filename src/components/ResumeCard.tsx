interface ResumeCardProps {
  title: string;
  uploadedDate: string;
}

export function ResumeCard({ title, uploadedDate }: ResumeCardProps) {
  return (
    <div className="flex-1 rounded-lg border border-[#E2DEF5] p-4">
      <div className="mb-1 text-sm text-ink">{title}</div>
      <div className="text-xs text-[#98A2B3]">업로드 {uploadedDate}</div>
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
      className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-stroke p-4 text-sm text-brand"
    >
      + 이력서 추가하기
    </button>
  );
}
