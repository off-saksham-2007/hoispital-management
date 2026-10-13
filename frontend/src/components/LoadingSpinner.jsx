export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-900"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-slate-300 font-semibold text-lg">CarePoint HMS</p>
          <p className="text-slate-500 text-sm mt-1">Loading…</p>
        </div>
      </div>
    </div>
  );
}
