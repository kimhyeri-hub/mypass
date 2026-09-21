import Logo from './Logo';

export default function FlowHeader() {
  return (
    <div className="flex items-center gap-2 border-b border-[#F0EEFB] px-10 py-5.5">
      <Logo size="sm" />
    </div>
  );
}
