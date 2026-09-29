import { useNavigate } from 'react-router-dom';
import { useInterviewSetup } from '../../context/InterviewSetupContext';
import type { InterviewSetupData } from '../../context/InterviewSetupContext';

const jobRoles = ['백엔드 개발자', '프론트엔드 개발자', '데이터 분석가'];
const difficulties: InterviewSetupData['difficulty'][] = ['쉬움', '보통', '어려움'];
const questionCounts = [5, 8, 10];

const modes: { value: InterviewSetupData['mode']; label: string; description: string; icon: string }[] = [
  {
    value: 'practice',
    label: '모의면접',
    description: '텍스트로 답변을 입력하며 편하게 연습해요',
    icon: 'ti-keyboard',
  },
  {
    value: 'live',
    label: '실전면접',
    description: 'AI가 음성으로 질문하고, 음성으로 답변해요',
    icon: 'ti-microphone-2',
  },
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { data, updateData } = useInterviewSetup();

  const handleStart = () => {
    navigate('/interview/starting');
  };

  return (
    <>
      <div className="mb-8">
        <div className="text-xl font-bold text-ink">면접을 어떻게 준비할까요</div>
        <div className="mt-1.5 text-sm text-muted">
          직무와 난이도에 맞춰 질문을 구성해드려요
        </div>
      </div>

      <div>
        <label className="mb-2.5 block text-sm text-[#3A3355]">면접 방식</label>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {modes.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => updateData({ mode: m.value })}
              className={`rounded-2xl border-[1.5px] p-4 text-left transition-colors ${
                data.mode === m.value ? 'border-brand bg-card' : 'border-stroke bg-white'
              }`}
            >
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-[11px] ${
                  data.mode === m.value ? 'bg-brand text-white' : 'bg-[#F4F2FA] text-muted'
                }`}
              >
                <i className={`ti ${m.icon} text-base`} aria-hidden="true" />
              </div>
              <div
                className={`mb-1 text-sm font-bold ${
                  data.mode === m.value ? 'text-brand' : 'text-ink'
                }`}
              >
                {m.label}
              </div>
              <div className="text-xs leading-relaxed text-muted">{m.description}</div>
            </button>
          ))}
        </div>

        <label className="mb-2 block text-sm text-[#3A3355]">지원 직무</label>
        <select
          value={data.jobRole}
          onChange={(e) => updateData({ jobRole: e.target.value })}
          className="mb-5 w-full rounded-lg border border-stroke px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
        >
          {jobRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm text-[#3A3355]">기반 프로젝트</label>
        <div className="mb-5 w-full rounded-lg border border-stroke px-3.5 py-2.5 text-sm text-ink">
          {data.projectName || '등록한 프로젝트가 없어요'}
        </div>

        <label className="mb-2.5 block text-sm text-[#3A3355]">난이도</label>
        <div className="mb-5 flex gap-2">
          {difficulties.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateData({ difficulty: level })}
              className={`flex-1 rounded-lg border py-2.5 text-xs ${
                data.difficulty === level
                  ? 'border-[1.5px] border-brand bg-card font-medium text-brand'
                  : 'border-stroke text-muted'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <label className="mb-2.5 block text-sm text-[#3A3355]">질문 개수</label>
        <div className="mb-6 flex gap-2">
          {questionCounts.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => updateData({ questionCount: count })}
              className={`flex-1 rounded-lg border py-2.5 text-xs ${
                data.questionCount === count
                  ? 'border-[1.5px] border-brand bg-card font-medium text-brand'
                  : 'border-stroke text-muted'
              }`}
            >
              {count}개
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/interview/upload')}
            className="text-sm text-muted"
          >
            ← 이전
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            면접 시작하기 →
          </button>
        </div>
      </div>
    </>
  );
}
