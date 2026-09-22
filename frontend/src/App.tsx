import { Outlet, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';
import ProjectRegister from './pages/interview/ProjectRegister';
import UploadResume from './pages/interview/UploadResume';
import Analyzing from './pages/interview/Analyzing';
import InterviewSetup from './pages/interview/InterviewSetup';
import InterviewStarting from './pages/interview/InterviewStarting';
import InterviewScreen from './pages/interview/InterviewScreen';
import { InterviewSetupProvider } from './context/InterviewSetupContext';
import FlowSidebar from './components/FlowSidebar';

// 면접 흐름(프로젝트 등록 ~ AI 면접관)에서 공통으로 쓰는 폼 데이터를
// 하나의 Provider로 감싸서, 단계를 이동해도 값이 유지되도록 합니다.
// 왼쪽에는 진행 단계를 보여주는 네비게이션을, 가운데에는 실제 화면을 배치합니다.
function InterviewFlowLayout() {
  return (
    <InterviewSetupProvider>
      <div className="flex min-h-screen">
        <FlowSidebar />
        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-[640px]">
            <Outlet />
          </div>
        </main>
      </div>
    </InterviewSetupProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/mypage" element={<MyPage />} />

      {/* 새 모의면접 시작 흐름: 프로젝트 등록 → 자료 업로드 → 분석 중 → 면접 설정 → 시작 준비 → AI 면접관 */}
      <Route element={<InterviewFlowLayout />}>
        <Route path="/interview/project" element={<ProjectRegister />} />
        <Route path="/interview/upload" element={<UploadResume />} />
        <Route path="/interview/analyzing" element={<Analyzing />} />
        <Route path="/interview/setup" element={<InterviewSetup />} />
        <Route path="/interview/starting" element={<InterviewStarting />} />
        <Route path="/interview" element={<InterviewScreen />} />
      </Route>
    </Routes>
  );
}
