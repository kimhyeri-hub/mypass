// MYPASS 로고 마크 (벡터 SVG라서 어떤 크기로 키워도 선명해요). 파일: src/assets/logo-mark.svg
import logoMark from '../assets/logo-mark.svg';

interface LogoMarkProps {
  className?: string;
}

export default function LogoMark({ className = 'h-6 w-6' }: LogoMarkProps) {
  return <img src={logoMark} alt="MYPASS" className={`${className} object-contain`} draggable={false} />;
}
