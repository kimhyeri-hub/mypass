import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !passwordConfirm) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않아요.');
      return;
    }

    setError('');
    // TODO: 백엔드 회원가입 API 연동
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
        <p className="mb-9 text-center text-sm text-muted">
          계정을 만들고 바로 시작해보세요
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="name" className="mb-2 block text-sm text-[#3A3355]">
            이름
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="mb-3.5 w-full rounded-lg border border-stroke px-3.5 py-3 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
          />

          <label htmlFor="email" className="mb-2 block text-sm text-[#3A3355]">
            학교 이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.ac.kr"
            className="mb-3.5 w-full rounded-lg border border-stroke px-3.5 py-3 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
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
            className="mb-3.5 w-full rounded-lg border border-stroke px-3.5 py-3 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
          />

          <label htmlFor="passwordConfirm" className="mb-2 block text-sm text-[#3A3355]">
            비밀번호 확인
          </label>
          <input
            id="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
            className="mb-2 w-full rounded-lg border border-stroke px-3.5 py-3 text-sm text-ink placeholder:text-[#A79FCB] focus:border-brand focus:outline-none"
          />

          {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            className="my-4 w-full rounded-lg bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark"
          >
            회원가입
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          이미 계정이 있으신가요? <Link to="/login" className="text-brand">로그인</Link>
        </p>
      </div>
    </div>
  );
}
