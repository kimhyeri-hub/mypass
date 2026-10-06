import { Link } from 'react-router-dom';
import Logo from './Logo';
import PrimaryButton from './PrimaryButton';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-[#F0EEFB] px-[6vw] py-6">
      <Logo />
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card hover:text-brand"
        >
          로그인
        </Link>
        <PrimaryButton to="/signup">회원가입</PrimaryButton>
      </div>
    </nav>
  );
}
