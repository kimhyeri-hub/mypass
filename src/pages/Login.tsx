import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setError('');
    // TODO: 백엔드 로그인 API 연동. 지금은 검증만 통과하면 마이페이지로 이동합니다.
    navigate('/mypage');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-[6vw]">
      <Link to="/" className="absolute left-[6vw] top-6 text-sm text-muted">
        ← MYPASS 홈으로
      </Link>

      <div className="w-full max-w-[360px]">
        <div className="mb-2 flex items-center justify-center">
          <Logo />
        </div>
        <p className="mb-10 text-center text-sm text-muted">
          이력서로 시작하는 실전 모의면접
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email" className="mb-2 block text-sm text-[#3A3355]">
            학교 이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.ac.kr"
            className="mb-4 w-full rounded-lg border border-stroke px-3.5 py-3 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
          />

          <label htmlFor="password" className="mb-2 block text-sm text-[#3A3355]">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mb-2 w-full rounded-lg border border-stroke px-3.5 py-3 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
          />

          {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

          <div className="mb-6 text-right">
            <span className="cursor-pointer text-xs text-brand">비밀번호를 잊으셨나요?</span>
          </div>

          <button
            type="submit"
            className="mb-7 w-full rounded-lg bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark"
          >
            로그인
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          계정이 없으신가요? <Link to="/signup" className="text-brand">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
