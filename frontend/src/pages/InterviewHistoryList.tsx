import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import InterviewRow from '../components/InterviewRow';
import { interviewHistory } from '../utils/interviewHistory';

type ModeFilter = 'all' | 'practice' | 'live';

const PAGE_SIZE = 4;

export default function InterviewHistoryList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return interviewHistory.filter((item) => {
      const matchesMode = modeFilter === 'all' || item.mode === modeFilter;
      const matchesKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.jobRole.toLowerCase().includes(keyword);
      return matchesMode && matchesKeyword;
    });
  }, [search, modeFilter]);

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
      <DashboardHeader userInitial="홍" />

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

        {pageItems.length > 0 ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-stroke bg-white">
            {pageItems.map((interview, index) => (
              <InterviewRow
                key={interview.id}
                title={interview.title}
                date={interview.date}
                questionCount={interview.questionCount}
                mode={interview.mode}
                score={interview.score}
                onReview={() => navigate(`/interview/result/${interview.id}`)}
                isLast={index === pageItems.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border-[1.5px] border-dashed border-stroke py-14 text-center text-sm text-muted">
            조건에 맞는 면접 기록이 없어요.
          </div>
        )}

        {totalPages > 1 && (
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
