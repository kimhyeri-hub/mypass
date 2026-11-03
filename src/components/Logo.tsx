import { Link } from 'react-router-dom';
import LogoMark from './LogoMark';

interface LogoProps {
  size?: 'sm' | 'md';
  to?: string;
}

export default function Logo({ size = 'md', to }: LogoProps) {
  const textSize = size === 'md' ? 'text-2xl' : 'text-xl';

  const content = (
    <div className="flex items-center gap-2">
      <LogoMark className={size === 'md' ? 'h-6 w-6' : 'h-5 w-5'} />
      <span className={`font-sans ${textSize} font-extrabold tracking-tight text-ink`}>
        MYPASS
      </span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
