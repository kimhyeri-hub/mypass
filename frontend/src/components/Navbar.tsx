import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import PrimaryButton from './PrimaryButton';
import ConfirmModal from './ConfirmModal';
import { clearStoredAuth, getStoredAuth } from '../utils/auth';

export default function Navbar() {
  // 로고 클릭이나 새로고침으로 Home에 와도, 저장된 토큰이 아직 유효하면 로그인 상태로 보여준다.
  const [user, setUser] = useState(getStoredAuth);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleConfirmLogout = () => {
    clearStoredAuth();
    setUser(null);
    setIsLogoutModalOpen(false);
  };

  return (
    <nav className="flex items-center justify-between border-b border-[#F0EEFB] px-[6vw] py-6">
      <Logo />
      {user ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card hover:text-brand"
          >
            로그아웃
          </button>
          <PrimaryButton to="/mypage">마이페이지</PrimaryButton>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card hover:text-brand"
          >
            로그인
          </Link>
          <PrimaryButton to="/signup">회원가입</PrimaryButton>
        </div>
      )}

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="로그아웃 하시겠어요?"
        description="다시 로그인해야 마이페이지를 볼 수 있어요."
        confirmLabel="로그아웃"
        cancelLabel="취소"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </nav>
  );
}
