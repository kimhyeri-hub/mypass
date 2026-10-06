import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import ListSkeleton from '../components/ListSkeleton';
import InlineError from '../components/InlineError';
import { initialResumes } from '../utils/resumes';
import type { ResumeItem } from '../utils/resumes';

export default function ResumeManage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeItem[]>(initialResumes);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);

  // TODO: 백엔드 연동 시 setTimeout 대신 실제 이력서 목록 조회 API를 호출하고,
  // 실패하면 setLoadError(true)로 에러 배너를 보여주세요.
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setLoadError(false);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleFileSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const sizeLabel = `${Math.max(1, Math.round(file.size / 1024))}KB`;
    const fileType = (file.name.split('.').pop() || 'PDF').toUpperCase();

    // TODO: 백엔드 연동 시 실제로 파일을 업로드하고, 응답으로 받은 이력서 정보로 교체합니다.
    if (replaceTargetId.current) {
      const targetId = replaceTargetId.current;
      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === targetId
            ? {
                ...resume,
                title: file.name.replace(/\.[^/.]+$/, ''),
                uploadedDate: formatToday(),
                fileType,
                sizeLabel,
              }
            : resume,
        ),
      );
      replaceTargetId.current = null;
    } else {
      setResumes((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          uploadedDate: formatToday(),
          fileType,
          sizeLabel,
          isDefault: prev.length === 0,
        },
      ]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddClick = () => {
    replaceTargetId.current = null;
    fileInputRef.current?.click();
  };

  const handleReplaceClick = (id: string) => {
    replaceTargetId.current = id;
    fileInputRef.current?.click();
  };

  const handleDelete = (id: string) => {
    // TODO: 백엔드 연동 시 삭제 API 호출 후 목록을 갱신합니다.
    setResumes((prev) => prev.filter((resume) => resume.id !== id));
  };

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardHeader userInitial="홍" />

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
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
          >
            <i className="ti ti-plus text-base" aria-hidden="true" />
            이력서 추가
          </button>
        </div>

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
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke text-muted hover:text-ink"
                    title="교체하기"
                  >
                    <i className="ti ti-replace text-base" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(resume.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke text-muted hover:border-[#F3D7DC] hover:text-[#C0455A]"
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
          className="w-full rounded-2xl border-[1.5px] border-dashed border-stroke bg-white py-9 text-center text-muted hover:border-brand hover:text-brand"
        >
          <i className="ti ti-cloud-upload mb-2.5 block text-2xl" aria-hidden="true" />
          <div className="mb-1 text-sm font-bold text-ink">이력서를 클릭해서 업로드하세요</div>
          <div className="text-xs">PDF, DOCX 파일 지원 (최대 10MB)</div>
        </button>
      </div>
    </div>
  );
}

function formatToday() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
