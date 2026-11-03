import { useEffect, useState } from 'react';
import { AUTH_CLEARED_EVENT, getStoredAuth } from '../utils/auth';

// 현재 로그인 상태인지 알려준다. 같은 화면에서 로그아웃하면 바로 false로 바뀐다.
export function useIsLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState(() => getStoredAuth() !== null);

  useEffect(() => {
    const handleCleared = () => setLoggedIn(false);
    window.addEventListener(AUTH_CLEARED_EVENT, handleCleared);
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleCleared);
  }, []);

  return loggedIn;
}
