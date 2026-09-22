interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[320px] rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-base font-bold text-ink">{title}</div>
        {description && <p className="mb-6 text-sm text-muted">{description}</p>}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-stroke py-2.5 text-sm text-[#3A3355]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
