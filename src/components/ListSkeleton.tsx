interface ListSkeletonProps {
  rows?: number;
}

// 목록이 불러와지는 동안 보여주는 회색 로딩 틀
export default function ListSkeleton({ rows = 4 }: ListSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-stroke bg-white" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-[22px] py-[18px] ${i < rows - 1 ? 'border-b border-stroke' : ''}`}
        >
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-xl bg-[#F1EEF9]" />
          <div className="flex-1">
            <div className="mb-2.5 h-3 w-3/5 animate-pulse rounded-lg bg-[#F1EEF9]" />
            <div className="h-2.5 w-1/3 animate-pulse rounded-lg bg-[#F1EEF9]" />
          </div>
          <div className="h-[34px] w-[72px] flex-shrink-0 animate-pulse rounded-[9px] bg-[#F1EEF9]" />
        </div>
      ))}
    </div>
  );
}
