import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStoredAuth } from '../utils/auth';

interface AuthLinkProps {
  // 로그인 상태일 때 / 아닐 때 각각 이동할 주소
  loggedInTo: string;
  loggedOutTo: string;
  className?: string;
  children: ReactNode;
}

// 로그인 여부에 따라 이동할 곳이 달라지는 링크.
// Navbar에서 로그아웃해도 이 컴포넌트는 다시 그려지지 않으므로,
// 클릭하는 순간에 로그인 상태를 다시 확인해서 이동한다.
export default function AuthLink({ loggedInTo, loggedOutTo, className, children }: AuthLinkProps) {
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // 새 탭 열기(Ctrl/Cmd/Shift 클릭, 휠 클릭)는 브라우저 기본 동작에 맡긴다.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(getStoredAuth() ? loggedInTo : loggedOutTo);
  };

  return (
    <Link to={getStoredAuth() ? loggedInTo : loggedOutTo} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
