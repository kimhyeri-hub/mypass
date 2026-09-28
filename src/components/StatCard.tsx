interface StatCardProps {
  label: string;
  value: string;
  icon: string;
}

export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stroke bg-white p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-card text-brand">
        <i className={`ti ${icon} text-lg`} aria-hidden="true" />
      </div>
      <div>
        <div className="text-2xl font-extrabold tracking-tight text-ink">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-muted">{label}</div>
      </div>
    </div>
  );
}
