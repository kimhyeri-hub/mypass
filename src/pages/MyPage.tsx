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
        {/* 인사 배너: 보라 그라데이션 + 알약 모양 버튼 */}
        <div className="mb-8 flex min-h-[150px] flex-col justify-between gap-5 rounded-[22px] bg-[linear-gradient(120deg,#6A2BD6_0%,#8B55EE_65%,#A97BF7_100%)] px-10 py-8 text-white shadow-[0_24px_40px_-22px_rgba(120,60,230,0.75),inset_0_1px_0_rgba(255,255,255,0.35)] md:flex-row md:items-center">
          <div>
            <div className="font-sans text-[30px] font-extrabold leading-tight tracking-tight">
              안녕하세요, 홍길동님
            </div>
            <p className="mt-2 text-[15px] text-[#EDE3FF]">오늘도 실전처럼 연습해볼까요</p>
          </div>
          <button
            onClick={handleStartInterview}
            className="flex flex-shrink-0 items-center gap-3 whitespace-nowrap rounded-full bg-white py-3.5 pl-[30px] pr-[18px] text-base font-extrabold text-[#4A1FA8] shadow-[0_14px_24px_-12px_rgba(60,20,130,0.55)] hover:bg-[#F3EEFF]"
          >
            새 모의면접 시작하기
            <span
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#8B5CF6] text-sm text-white"
              aria-hidden="true"
            >
              →
            </span>
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
