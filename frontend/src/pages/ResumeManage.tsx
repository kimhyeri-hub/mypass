import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import ListSkeleton from '../components/ListSkeleton';
import InlineError from '../components/InlineError';
import { deleteResume, getMyResumes, replaceResume, uploadResume } from '../api/resumes';
import { toResumeItem, validateResumeFile } from '../utils/resumes';
import type { ResumeItem } from '../utils/resumes';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function ResumeManage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!isLoading) return;
    let cancelled = false;
    getMyResumes()
      .then((list) => {
        if (cancelled) return;
        setResumes(list.map(toResumeItem));
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  const handleFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const targetId = replaceTargetId.current;
    replaceTargetId.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const invalid = validateResumeFile(file);
    if (invalid) {
      setActionError(invalid);
      return;
    }

    setActionError('');
    setIsSaving(true);
    try {
      if (targetId) {
        const saved = toResumeItem(await replaceResume(Number(targetId), file));
        setResumes((prev) => prev.map((resume) => (resume.id === targetId ? saved : resume)));
      } else {
        const saved = toResumeItem(await uploadResume(file));
        setResumes((prev) => [...prev, saved]);
      }
    } catch (error) {
      setActionError(errorMessage(error, '이력서를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClick = () => {
    replaceTargetId.current = null;
    fileInputRef.current?.click();
  };

  const handleReplaceClick = (id: string) => {
    replaceTargetId.current = id;
    fileInputRef.current?.click();
  };

  const handleDelete = async (id: string) => {
    setActionError('');
    setIsSaving(true);
    try {
      await deleteResume(Number(id));
      // 기본 이력서를 지우면 서버가 남은 것 중 가장 먼저 올린 이력서를 기본으로 올리므로 목록을 다시 받는다.
      const list = await getMyResumes();
      setResumes(list.map(toResumeItem));
    } catch (error) {
      setActionError(errorMessage(error, '이력서를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardHeader />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files)}
      />

      <div className="mx-auto max-w-[820px] px-8 py-10">
        <button
          type="button"
          onClick={() => navigate('/mypage')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <i className="ti ti-arrow-left text-base" aria-hidden="true" />
          마이페이지로
        </button>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[22px] font-extrabold text-ink">내 이력서 관리</h1>
          <button
            type="button"
            onClick={handleAddClick}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className="ti ti-plus text-base" aria-hidden="true" />
            {isSaving ? '저장 중…' : '이력서 추가'}
          </button>
        </div>

        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-[#F3D7DC] bg-[#FDF3F5] px-4 py-3 text-[13px] text-[#C0455A]"
          >
            {actionError}
          </div>
        )}

        {isLoading ? (
          <div className="mb-4">
            <ListSkeleton rows={2} />
          </div>
        ) : loadError ? (
          <div className="mb-4">
            <InlineError
              message="이력서 목록을 불러오지 못했어요."
              onRetry={() => {
                setLoadError(false);
                setIsLoading(true);
              }}
            />
          </div>
        ) : resumes.length > 0 ? (
          <div className="mb-4 flex flex-col gap-3.5">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center gap-4 rounded-2xl border border-stroke bg-white p-5"
              >
                <div className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[13px] bg-card text-xl text-brand">
                  <i className="ti ti-file-text" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold text-ink">{resume.title}</div>
                    {resume.isDefault && (
                      <span className="flex-shrink-0 rounded-full bg-card px-2 py-0.5 text-[10.5px] font-bold text-brand">
                        기본 이력서
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {resume.uploadedDate} 업로드 · {resume.fileType} · {resume.sizeLabel}
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleReplaceClick(resume.id)}
                    disabled={isSaving}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    title="교체하기"
                  >
                    <i className="ti ti-replace text-base" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(resume.id)}
                    disabled={isSaving}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke text-muted hover:border-[#F3D7DC] hover:text-[#C0455A] disabled:cursor-not-allowed disabled:opacity-50"
                    title="삭제하기"
                  >
                    <i className="ti ti-trash text-base" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border-[1.5px] border-dashed border-stroke py-14 text-center">
            <i className="ti ti-file-off mb-3 block text-[28px] text-[#C9C1E8]" aria-hidden="true" />
            <p className="text-sm text-muted">아직 등록된 이력서가 없어요.</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleAddClick}
          disabled={isSaving}
          className="w-full rounded-2xl border-[1.5px] border-dashed border-stroke bg-white py-9 text-center text-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className="ti ti-cloud-upload mb-2.5 block text-2xl" aria-hidden="true" />
          <div className="mb-1 text-sm font-bold text-ink">이력서를 클릭해서 업로드하세요</div>
          <div className="text-xs">PDF, DOCX 파일 지원 (최대 10MB)</div>
        </button>
      </div>
    </div>
  );
}