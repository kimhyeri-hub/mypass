// 로그인 시 Login.tsx가 localStorage에 저장하는 값들. api/client.ts도 같은 키로 토큰을 읽는다.
const TOKEN_KEY = 'mypass_token';
const USER_KEY = 'mypass_user';

export interface StoredUser {
  email?: string;
  name?: string;
}

// JWT의 exp(초)만 읽어서 만료 여부를 본다. 서명 검증은 서버만 할 수 있으므로,
// 여기서는 "화면에 로그인 상태를 보여줘도 되는지"만 판단하고 실제 인증은 계속 서버가 한다.
function isTokenUnexpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // localStorage를 쓸 수 없는 환경이면 지울 것도 없다.
  }
}

// 만료되지 않은 토큰이 있으면 저장된 사용자 정보를, 없으면 null을 돌려준다.
// 만료되었거나 형식이 깨진 토큰은 남겨 두면 화면과 실제 인증 상태가 어긋나므로 함께 지운다.
export function getStoredAuth(): StoredUser | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (!isTokenUnexpired(token)) {
      clearStoredAuth();
      return null;
    }
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as StoredUser) : {};
  } catch {
    return null;
  }
}
