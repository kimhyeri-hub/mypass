import { useLocation } from 'react-router-dom';
import Logo from './Logo';

const steps = [
  { label: '프로젝트 등록', path: '/interview/project' },
  { label: '자료 업로드', path: '/interview/upload' },
  { label: '문서 분석', path: '/interview/analyzing' },
  { label: '면접 설정', path: '/interview/setup' },
  { label: '면접 준비', path: '/interview/starting' },
  { label: 'AI 면접', path: '/interview' },
];

export default function FlowSidebar() {
  const location = useLocation();
  const currentIndex = steps.findIndex((step) => step.path === location.pathname);

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-stroke bg-white px-7 py-9">
      <Logo size="sm" to="/" />

      <nav className="mt-10 flex flex-col gap-1">
        {steps.map((step, index) => {
          const isDone = currentIndex > -1 && index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isCurrent ? 'bg-card font-medium text-brand' : isDone ? 'text-ink' : 'text-[#B7B2CF]'
              }`}
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isCurrent
                    ? 'bg-brand text-white'
                    : isDone
                      ? 'bg-ink text-white'
                      : 'border border-[#E2DEF0] text-[#B7B2CF]'
                }`}
              >
                {isDone ? (
                  <i className="ti ti-check text-[10px]" aria-hidden="true" />
                ) : (
                  String(index + 1).padStart(2, '0')
                )}
              </span>
              {step.label}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
