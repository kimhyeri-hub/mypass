import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';

export default function ProjectRegister() {
  const navigate = useNavigate();
  const { data, updateData } = useInterviewSetup();

  const [projectName, setProjectName] = useState(data.projectName);
  const [projectDescription, setProjectDescription] = useState(data.projectDescription);
  const [role, setRole] = useState(data.role);
  const [techInput, setTechInput] = useState('');
  const [techStack, setTechStack] = useState<string[]>(data.techStack);
  const [error, setError] = useState('');

  const handleAddTech = () => {
    const trimmed = techInput.trim();
    if (!trimmed) return;
    if (techStack.includes(trimmed)) {
      setTechInput('');
      return;
    }
    setTechStack([...techStack, trimmed]);
    setTechInput('');
  };

  const handleRemoveTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!projectName.trim() || !projectDescription.trim() || !role.trim()) {
      setError('프로젝트명, 설명, 담당 역할을 모두 입력해 주세요.');
      return;
    }

    setError('');
    updateData({ projectName, projectDescription, role, techStack });
    navigate('/interview/upload');
  };

  return (
    <>
      <div className="px-10 pb-2 pt-9">
        <div className="text-xl font-bold text-ink">프로젝트를 등록해주세요</div>
        <div className="mt-1.5 text-sm text-muted">
          면접 질문은 이 정보를 바탕으로 만들어져요
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[480px] px-10 pb-3 pt-7">
        <label htmlFor="projectName" className="mb-1.5 block text-sm text-[#3A3355]">
          프로젝트명
        </label>
        <input
          id="projectName"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="예: MYPASS - AI 모의면접 서비스"
          className="mb-4 w-full rounded-lg border border-stroke px-3.5 py-2.5 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
        />

        <label htmlFor="projectDescription" className="mb-1.5 block text-sm text-[#3A3355]">
          프로젝트 설명
        </label>
        <textarea
          id="projectDescription"
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          placeholder="어떤 프로젝트인지, 어떤 문제를 해결했는지 간단히 적어주세요"
          rows={3}
          className="mb-4 w-full resize-none rounded-lg border border-stroke px-3.5 py-2.5 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
        />

        <label className="mb-2 block text-sm text-[#3A3355]">기술 스택</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => handleRemoveTech(tech)}
              className="rounded-full bg-card px-3 py-1.5 text-xs text-brand"
            >
              {tech} ×
            </button>
          ))}
        </div>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTech();
              }
            }}
            placeholder="예: React"
            className="flex-1 rounded-lg border border-dashed border-stroke px-3.5 py-2 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddTech}
            className="rounded-lg border border-stroke px-4 text-sm text-[#3A3355]"
          >
            추가
          </button>
        </div>

        <label htmlFor="role" className="mb-1.5 block text-sm text-[#3A3355]">
          담당 역할
        </label>
        <input
          id="role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="예: 프론트엔드 개발, UI 설계"
          className="mb-2 w-full rounded-lg border border-stroke px-3.5 py-2.5 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
        />

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="text-sm text-muted"
          >
            ← 이전
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            다음 →
          </button>
        </div>
      </form>
    </>
  );
}
