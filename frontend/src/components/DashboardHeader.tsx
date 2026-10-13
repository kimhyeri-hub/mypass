import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import ConfirmModal from './ConfirmModal';

export default function DashboardHeader() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // 로그인 시 Login.tsx가 localStorage에 저장해둔 사용자 이름에서 첫 글자만 사용한다.
  let userInitial = '?';
  try {
    const stored = localStorage.getItem('mypass_user');
    if (stored) {
      const user = JSON.parse(stored) as { name?: string };
      if (user.name) userInitial = user.name.charAt(0);
    }
  } catch {
    // localStorage를 못 읽는 환경이면 기본값('?')을 그대로 둔다.
  }

  const handleConfirmLogout = () => {
    localStorage.removeItem('mypass_token');
    localStorage.removeItem('mypass_user');
    setIsLogoutModalOpen(false);
    navigate('/');
  };

  return (
    <div className="flex items-center justify-between border-b border-stroke bg-white px-12 py-[22px]">
      <Logo to="/" />
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="text-xs text-muted hover:text-ink"
        >
          로그아웃
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#8F6FF0] text-sm font-semibold text-white">
          {userInitial}
        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="로그아웃 하시겠어요?"
        description="다시 로그인해야 마이페이지를 볼 수 있어요."
        confirmLabel="로그아웃"
        cancelLabel="취소"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}
