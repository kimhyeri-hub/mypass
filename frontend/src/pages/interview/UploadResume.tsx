import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
}

export default function UploadResume() {
  const navigate = useNavigate();
  const { data, updateData } = useInterviewSetup();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState(data.resumeFileName);
  const [file, setFile] = useState<File | null>(data.resumeFile);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const acceptFile = (selected: File) => {
    if (selected.type !== 'application/pdf') {
      setError('PDF 파일만 업로드할 수 있어요.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB를 넘을 수 없어요.');
      return;
    }
    setError('');
    setFile(selected);
    setFileName(selected.name);
    setFileSize(formatFileSize(selected.size));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const handleNext = () => {
    if (!fileName || !file) {
      setError('자료를 하나 이상 업로드해 주세요.');
      return;
    }
    updateData({ resumeFileName: fileName, resumeFile: file });
    navigate('/interview/analyzing');
  };

  return (
    <>
      <div className="px-10 pb-2 pt-9">
        <div className="text-xl font-bold text-ink">관련 자료를 업로드해주세요</div>
        <div className="mt-1.5 text-sm text-muted">
          이력서나 프로젝트 문서(PDF)를 올려주시면 더 정확한 질문을 만들 수 있어요
        </div>
      </div>

      <div className="max-w-[480px] px-10 pb-3 pt-7">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-[1.5px] border-dashed px-6 py-10 text-center transition-colors ${
            isDragOver ? 'border-brand bg-card' : 'border-stroke bg-[#FAF9FF]'
          }`}
        >
          <i className="ti ti-file-upload text-2xl text-brand" aria-hidden="true" />
          <div className="mt-3 text-sm text-[#3A3355]">
            PDF 파일을 드래그하거나 클릭해서 업로드
          </div>
          <div className="mt-1 text-xs text-[#98A2B3]">최대 10MB</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {fileName && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-[#E2DEF5] px-3.5 py-3">
            <div className="flex items-center gap-2">
              <i className="ti ti-file-text text-base text-brand" aria-hidden="true" />
              <span className="text-sm text-ink">{fileName}</span>
            </div>
            {fileSize && <span className="text-xs text-[#98A2B3]">{fileSize}</span>}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/interview/project')}
            className="text-sm text-muted"
          >
            ← 이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            다음 →
          </button>
        </div>
      </div>
    </>
  );
}
