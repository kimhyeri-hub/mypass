import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import ConfirmModal from './ConfirmModal';

interface DashboardHeaderProps {
  userInitial: string;
}

export default function DashboardHeader({ userInitial }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleConfirmLogout = () => {
    // TODO: 실제 로그아웃 처리(토큰 삭제 등)는 백엔드 연동 시 여기에 추가
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
