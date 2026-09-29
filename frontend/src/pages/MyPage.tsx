import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import InterviewRow from '../components/InterviewRow';
import { ResumeCard, AddResumeCard } from '../components/ResumeCard';
import { interviewHistory } from '../utils/interviewHistory';
import { initialResumes } from '../utils/resumes';

const RECENT_COUNT = 3;

export default function MyPage() {
  const navigate = useNavigate();
  const recentInterviews = interviewHistory.slice(0, RECENT_COUNT);

  const handleStartInterview = () => {
    // 새 모의면접 흐름 시작: 프로젝트 등록 → 자료 업로드 → 분석 중 → 면접 설정 → 면접 시작 준비 → AI 면접관
    navigate('/interview/project');
  };

  const handleViewAllHistory = () => {
    navigate('/mypage/history');
  };

  const handleReview = (interviewId: string) => {
    navigate(`/interview/result/${interviewId}`);
  };

  const handleManageResumes = () => {
    navigate('/mypage/resumes');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardHeader userInitial="홍" />

      <div className="mx-auto max-w-[1040px] px-8 py-10">
        <div className="mb-8 flex items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-brand-dark via-brand to-[#8A6BF2] px-10 py-9 text-white shadow-[0_20px_40px_-20px_rgba(108,78,224,0.55)]">
          <div>
            <div className="font-serif text-2xl font-bold tracking-tight">
              안녕하세요, 홍길동님
            </div>
            <p className="mt-1.5 text-sm text-[#DCD3FA]">오늘도 실전처럼 연습해볼까요</p>
          </div>
          <button
            onClick={handleStartInterview}
            className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-dark shadow-[0_10px_20px_-8px_rgba(0,0,0,0.25)] hover:bg-[#F6F3FE]"
          >
            <i className="ti ti-microphone-2 text-base" aria-hidden="true" />
            새 모의면접 시작하기
          </button>
        </div>

        <div className="mb-10 grid grid-cols-3 gap-4">
          <StatCard label="총 면접 횟수" value={`${interviewHistory.length}회`} icon="ti-history" />
          <StatCard label="이번 달 연습" value="4회" icon="ti-calendar-stats" />
          <StatCard label="등록한 이력서" value={`${initialResumes.length}개`} icon="ti-file-text" />
        </div>

        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[15px] font-bold text-ink">최근 면접</div>
          <button onClick={handleViewAllHistory} className="text-xs font-semibold text-brand">
            전체 기록 보기
          </button>
        </div>
        {recentInterviews.length > 0 ? (
          <div className="mb-10 overflow-hidden rounded-2xl border border-stroke bg-white">
            {recentInterviews.map((interview, index) => (
              <InterviewRow
                key={interview.id}
                title={interview.title}
                date={interview.date}
                questionCount={interview.questionCount}
                mode={interview.mode}
                score={interview.score}
                onReview={() => handleReview(interview.id)}
                isLast={index === recentInterviews.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="mb-10 rounded-2xl border-[1.5px] border-dashed border-stroke py-12 text-center">
            <i className="ti ti-message-2 mb-2.5 block text-2xl text-[#C9C1E8]" aria-hidden="true" />
            <p className="mb-3 text-sm text-muted">아직 진행한 면접이 없어요.</p>
            <button
              onClick={handleStartInterview}
              className="text-xs font-semibold text-brand hover:underline"
            >
              첫 모의면접 시작하기
            </button>
          </div>
        )}

        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[15px] font-bold text-ink">내 이력서와 프로젝트</div>
          <button onClick={handleManageResumes} className="text-xs font-semibold text-brand">
            관리하기
          </button>
        </div>
        <div className="flex gap-3.5">
          {initialResumes.map((resume) => (
            <ResumeCard key={resume.id} title={resume.title} uploadedDate={resume.uploadedDate} />
          ))}
          <AddResumeCard onClick={handleManageResumes} />
        </div>
      </div>
    </div>
  );
}
