import Logo from './Logo';
import PrimaryButton from './PrimaryButton';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-[#F0EEFB] px-[6vw] py-6">
      <Logo />
      <PrimaryButton to="/login">시작하기</PrimaryButton>
    </nav>
  );
}
