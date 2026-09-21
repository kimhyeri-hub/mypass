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
  const handleStartInterview = () => {
    // TODO: 새 모의면접 시작 플로우로 이동
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
    <div>
      <DashboardHeader userInitial="홍" />

      <div className="flex items-center justify-between px-10 pb-2 pt-8">
        <div>
          <div className="text-xl font-bold text-ink">안녕하세요, 홍길동님</div>
          <div className="mt-1 text-sm text-muted">오늘도 실전처럼 연습해볼까요</div>
        </div>
        <button
          onClick={handleStartInterview}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          새 모의면접 시작하기
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 px-10 py-6">
        <StatCard label="총 면접 횟수" value="12회" />
        <StatCard label="이번 달 연습" value="4회" />
        <StatCard label="등록한 이력서" value={`${resumes.length}개`} />
      </div>

      <div className="flex items-center justify-between px-10 pb-2 pt-5">
        <div className="text-sm font-bold text-ink">최근 면접</div>
        <button onClick={handleViewAllHistory} className="text-xs text-brand">
          전체 기록 보기
        </button>
      </div>
      <div className="px-10 pb-6 pt-2">
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

      <div className="px-10 pb-8">
        <div className="mb-3 text-sm font-bold text-ink">내 이력서와 프로젝트</div>
        <div className="flex gap-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} title={resume.title} uploadedDate={resume.uploadedDate} />
          ))}
          <AddResumeCard onClick={handleAddResume} />
        </div>
      </div>
    </div>
  );
}
