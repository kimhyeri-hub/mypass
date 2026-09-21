import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md';
  to?: string;
}

export default function Logo({ size = 'md', to }: LogoProps) {
  const textSize = size === 'md' ? 'text-2xl' : 'text-xl';

  const content = (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
      <span className={`font-serif ${textSize} font-bold tracking-tight text-ink`}>
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
