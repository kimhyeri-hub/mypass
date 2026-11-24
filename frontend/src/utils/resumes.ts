import type { ResumeResponse } from '../api/resumes';

export interface ResumeItem {
  id: string;
  title: string;
  uploadedDate: string;
  fileType: string;
  sizeLabel: string;
  isDefault: boolean;
}

export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export function toResumeItem(resume: ResumeResponse): ResumeItem {
  return {
    id: String(resume.resumeId),
    title: resume.title,
    uploadedDate: formatDate(resume.uploadedAt),
    fileType: resume.fileType ?? 'FILE',
    sizeLabel: formatSize(resume.fileSize),
    isDefault: resume.isDefault,
  };
}

// 올리기 전에 브라우저에서 먼저 걸러서, 서버까지 갔다가 되돌아오는 일을 줄인다. 서버도 같은 기준으로 한 번 더 확인한다.
export function validateResumeFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!RESUME_EXTENSIONS.includes(extension)) return 'PDF, DOC, DOCX 파일만 올릴 수 있어요.';
  if (file.size > RESUME_MAX_BYTES) return '파일 크기는 10MB를 넘을 수 없어요.';
  return null;
}
