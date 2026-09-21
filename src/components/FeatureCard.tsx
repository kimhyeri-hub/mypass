import PrimaryButton from './PrimaryButton';

interface FeatureCardProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
  variant?: 'fill' | 'outline';
}

export default function FeatureCard({
  title,
  description,
  ctaLabel,
  ctaTo,
  variant = 'fill',
}: FeatureCardProps) {
  return (
    <div className="flex-1 rounded-2xl bg-card p-7">
      <h3 className="mb-2 whitespace-pre-line text-base font-bold text-ink">{title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-muted">{description}</p>
      <PrimaryButton to={ctaTo} variant={variant}>
        {ctaLabel}
      </PrimaryButton>
    </div>
  );
}
