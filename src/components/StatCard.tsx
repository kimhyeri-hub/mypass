interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stroke bg-white p-5">
      <div>
        <div className="text-2xl font-extrabold tracking-tight text-ink">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-muted">{label}</div>
      </div>
    </div>
  );
}
