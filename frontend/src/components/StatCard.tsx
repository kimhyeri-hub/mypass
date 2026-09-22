interface StatCardProps {
  label: string;
  value: string;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg bg-card px-4 py-4">
      <div className="mb-1.5 text-xs text-muted">{label}</div>
      <div className="text-xl font-bold text-ink">{value}</div>
    </div>
  );
}
