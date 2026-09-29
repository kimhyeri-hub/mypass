import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import InterviewRow from '../components/InterviewRow';
import { ResumeCard, AddResumeCard } from '../components/ResumeCard';

interface Interview {
  id: string;
  title: string;
  date: string;
  questionCount: number;
}

interface Resume {
  id: string;
  title: string;
  uploadedDate: string;
}

const recentInterviews: Interview[] = [
  { id: '1', title: '백엔드 개발자 면접', date: '2026.09.05', questionCount: 8 },
  { id: '2', title: '프론트엔드 개발자 면접', date: '2026.08.28', questionCount: 6 },
  { id: '3', title: '데이터 분석가 면접', date: '2026.08.14', questionCount: 7 },
];

const resumes: Resume[] = [
  { id: '1', title: '2026 신입 개발자 이력서', uploadedDate: '2026.08.01' },
];

export default function MyPage() {
  const navigate = useNavigate();

  const handleStartInterview = () => {
    // 새 모의면접 흐름 시작: 프로젝트 등록 → 자료 업로드 → 분석 중 → 면접 설정 → 면접 시작 준비 → AI 면접관
    navigate('/interview/project');
  };

  const handleViewAllHistory = () => {
    // TODO: 전체 면접 기록 페이지로 이동
  };

  const handleReview = (interviewId: string) => {
    // TODO: 해당 면접의 상세 리뷰 화면으로 이동
    console.log('review', interviewId);
  };

  const handleAddResume = () => {
    // TODO: 이력서 업로드 플로우로 이동
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
          <StatCard label="총 면접 횟수" value="12회" icon="ti-history" />
          <StatCard label="이번 달 연습" value="4회" icon="ti-calendar-stats" />
          <StatCard label="등록한 이력서" value={`${resumes.length}개`} icon="ti-file-text" />
        </div>

        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[15px] font-bold text-ink">최근 면접</div>
          <button onClick={handleViewAllHistory} className="text-xs font-semibold text-brand">
            전체 기록 보기
          </button>
        </div>
        <div className="mb-10 overflow-hidden rounded-2xl border border-stroke bg-white">
          {recentInterviews.map((interview, index) => (
            <InterviewRow
              key={interview.id}
              title={interview.title}
              date={interview.date}
              questionCount={interview.questionCount}
              onReview={() => handleReview(interview.id)}
              isLast={index === recentInterviews.length - 1}
            />
          ))}
        </div>

        <div className="mb-3.5 text-[15px] font-bold text-ink">내 이력서와 프로젝트</div>
        <div className="flex gap-3.5">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} title={resume.title} uploadedDate={resume.uploadedDate} />
          ))}
          <AddResumeCard onClick={handleAddResume} />
        </div>
      </div>
    </div>
  );
}
