import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface PrimaryButtonProps {
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'fill' | 'outline';
  fullWidth?: boolean;
  children: ReactNode;
}

export default function PrimaryButton({
  to,
  onClick,
  type = 'button',
  variant = 'fill',
  fullWidth = false,
  children,
}: PrimaryButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors';
  const styles =
    variant === 'fill'
      ? 'bg-brand text-white hover:bg-brand-dark'
      : 'border border-brand bg-white text-brand hover:bg-card';
  const width = fullWidth ? 'w-full' : '';
  const className = `${base} ${styles} ${width}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
