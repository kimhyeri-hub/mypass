import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import InterviewHistoryList from './pages/InterviewHistoryList';
import ResumeManage from './pages/ResumeManage';
import NotFound from './pages/NotFound';
import ProjectRegister from './pages/interview/ProjectRegister';
import UploadResume from './pages/interview/UploadResume';
import Analyzing from './pages/interview/Analyzing';
import InterviewSetup from './pages/interview/InterviewSetup';
import InterviewStarting from './pages/interview/InterviewStarting';
import InterviewScreen from './pages/interview/InterviewScreen';
import LiveInterviewScreen from './pages/interview/LiveInterviewScreen';
import InterviewResult from './pages/interview/InterviewResult';
import { InterviewSetupProvider } from './context/InterviewSetupContext';
import FlowSidebar from './components/FlowSidebar';
import { LIVE_INTERVIEW_ENABLED } from './utils/features';

// 면접 흐름(프로젝트 등록 ~ AI 면접)에서 공통으로 쓰는 폼 데이터를
// 하나의 Provider로 감싸서, 단계를 이동해도 값이 유지되도록 합니다.
function InterviewProviderLayout() {
  return (
    <InterviewSetupProvider>
      <Outlet />
    </InterviewSetupProvider>
  );
}

// 왼쪽에는 진행 단계를 보여주는 네비게이션을, 가운데에는 실제 화면을 배치합니다.
function InterviewFlowLayout() {
  return (
    <div className="flex min-h-screen bg-canvas">
      <FlowSidebar />
      <main className="flex flex-1 justify-center px-10 py-14">
        <div className="h-fit w-full max-w-[620px] rounded-[28px] border border-stroke bg-white p-10 shadow-[0_24px_48px_-32px_rgba(30,18,64,0.18)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// 실전면접용: 같은 사이드바를 두되, 카메라·대화 화면이 넓게 쓰이도록 흰 카드 없이 가득 채웁니다.
function InterviewWideLayout() {
  return (
    <div className="flex min-h-screen bg-canvas">
      <FlowSidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/mypage/history" element={<InterviewHistoryList />} />
      <Route path="/mypage/resumes" element={<ResumeManage />} />

      <Route element={<InterviewProviderLayout />}>
        {/* 새 모의면접 시작 흐름: 프로젝트 등록 → 자료 업로드 → 분석 중 → 면접 설정 → 시작 준비 → (모의/실전) */}
        <Route element={<InterviewFlowLayout />}>
          <Route path="/interview/project" element={<ProjectRegister />} />
          <Route path="/interview/upload" element={<UploadResume />} />
          <Route path="/interview/analyzing" element={<Analyzing />} />
          <Route path="/interview/setup" element={<InterviewSetup />} />
          <Route path="/interview/starting" element={<InterviewStarting />} />
          {/* 모의면접: 텍스트로 답변 입력 */}
          <Route path="/interview" element={<InterviewScreen />} />
        </Route>

        <Route element={<InterviewWideLayout />}>
          <Route
            path="/interview/live"
            element={LIVE_INTERVIEW_ENABLED ? <LiveInterviewScreen /> : <Navigate to="/interview/setup" replace />}
          />
        </Route>

        {/* 면접 결과/AI 분석 화면. 모의·실전 모두 마지막 질문 후 여기로 옵니다. */}
        <Route path="/interview/result" element={<InterviewResult />} />
        {/* 마이페이지의 "다시보기"로 들어오는, 지난 면접의 결과 화면 */}
        <Route path="/interview/result/:id" element={<InterviewResult />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
