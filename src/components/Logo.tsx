interface LogoProps {
  size?: 'sm' | 'md';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const textSize = size === 'md' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
      <span className={`font-serif ${textSize} font-bold tracking-tight text-ink`}>
        MYPASS
      </span>
    </div>
  );
}
