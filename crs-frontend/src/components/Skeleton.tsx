//Hiệu ứng khung xương chờ tải dữ liệu (loading placeholder).
export function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-slate-800" />
          <div className="mt-4 h-3 w-1/3 rounded bg-slate-800" />
          <div className="mt-3 h-5 w-4/5 rounded bg-slate-800" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-800" />
        </div>
      ))}
    </div>
  )
}

export function AuthSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-4 w-28 rounded bg-white/10" />
      <div className="h-12 rounded-xl bg-white/10" />
      <div className="h-12 rounded-xl bg-white/10" />
      <div className="h-12 rounded-xl bg-white/10" />
      <div className="h-12 rounded-xl bg-lime-400/20" />
    </div>
  )
}
