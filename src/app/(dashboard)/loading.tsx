export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse w-full max-w-full">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 sm:w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-4 w-64 sm:w-80 bg-slate-100 dark:bg-slate-900 rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl self-start sm:self-auto" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-slate-900 rounded" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
