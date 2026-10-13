import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import InterviewRow from '../components/InterviewRow';
import ListSkeleton from '../components/ListSkeleton';
import InlineError from '../components/InlineError';
import { getMySessions } from '../api/interview';
import type { SessionResponse } from '../api/interview';
import { JOB_ROLE_LABELS } from '../utils/jobRoleLabels';

type ModeFilter = 'all' | 'practice' | 'live';

const PAGE_SIZE = 4;

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function InterviewHistoryList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [page, setPage] = useState(1);

  const [sessions, setSessions] = useState<SessionResponse[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const isLoading = sessions === null && !loadError;

  const loadSessions = () => {
    queueMicrotask(() => setLoadError(false));
    getMySessions()
      .then(setSessions)
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const completedSessions = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => s.status === 'COMPLETED')
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [sessions],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return completedSessions.filter((session) => {
      // 백엔드 InterviewMode는 아직 PRACTICE만 있어서, 실전면접(live)으로 저장되는 세션은 없다.
      const matchesMode = modeFilter === 'all' || modeFilter === 'practice';
      const title = session.jobRole ? JOB_ROLE_LABELS[session.jobRole] : '모의면접';
      const matchesKeyword = !keyword || title.toLowerCase().includes(keyword);
      return matchesMode && matchesKeyword;
    });
  }, [completedSessions, search, modeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (next: ModeFilter) => {
    setModeFilter(next);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardHeader />

      <div className="mx-auto max-w-[920px] px-8 py-10">
        <button
          type="button"
          onClick={() => navigate('/mypage')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <i className="ti ti-arrow-left text-base" aria-hidden="true" />
          마이페이지로
        </button>

        <h1 className="mb-6 text-[22px] font-extrabold text-ink">전체 면접 기록</h1>

        <div className="mb-4 flex flex-wrap gap-2.5">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border-[1.5px] border-stroke bg-white px-3.5 py-2.5">
            <i className="ti ti-search text-base text-muted" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="직무나 제목으로 검색"
              className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-[#B6AED8]"
            />
          </div>
          {(
            [
              { key: 'all', label: '전체' },
              { key: 'practice', label: '모의면접' },
              { key: 'live', label: '실전면접' },
            ] as { key: ModeFilter; label: string }[]
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleFilterChange(option.key)}
              className={`rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-semibold transition-colors ${
                modeFilter === option.key
                  ? 'border-brand bg-card text-brand'
                  : 'border-stroke bg-white text-[#3A3355]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mb-6">
            <ListSkeleton rows={PAGE_SIZE} />
          </div>
        ) : loadError ? (
          <div className="mb-6">
            <InlineError message="면접 기록을 불러오지 못했어요." onRetry={loadSessions} />
          </div>
        ) : pageItems.length > 0 ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-stroke bg-white">
            {pageItems.map((session, index) => (
              <InterviewRow
                key={session.sessionId}
                title={session.jobRole ? JOB_ROLE_LABELS[session.jobRole] : '모의면접'}
                date={formatDate(session.startedAt)}
                questionCount={session.questionCount ?? session.questions.length}
                mode="practice"
                score={session.overallContentScore ?? undefined}
                onReview={() => navigate(`/interview/result/${session.sessionId}`)}
                isLast={index === pageItems.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border-[1.5px] border-dashed border-stroke py-14 text-center text-sm text-muted">
            조건에 맞는 면접 기록이 없어요.
          </div>
        )}

        {!isLoading && !loadError && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-white text-sm text-ink disabled:opacity-40"
            >
              <i className="ti ti-chevron-left" aria-hidden="true" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold ${
                  num === currentPage
                    ? 'border-brand bg-brand text-white'
                    : 'border-stroke bg-white text-ink'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-white text-sm text-ink disabled:opacity-40"
            >
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
