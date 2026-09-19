import AttendanceCalendar from '../Components/AttendanceCalendar';
import ParentSetupProgressWidget from '../Components/onboarding/ParentSetupProgressWidget';
import RecentUpdatesList from '../Components/parent/RecentUpdatesList';
import { useChildrenOverview, useChildrenUpdates } from '../hooks/useChildrenOverview';
import { ErrorState } from '../Components/StateComponents';

/** One overview stat card. */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:bg-slate-900">
      <p className="mb-1 text-sm text-gray-500 dark:text-slate-400">{label}</p>
      <h2 className="text-2xl font-medium text-gray-900 sm:text-3xl dark:text-slate-100">{value}</h2>
    </div>
  );
}

/**
 * The parent's landing page: at-a-glance stats across every child, recent
 * updates, and the selected child's attendance calendar.
 *
 * @returns The page.
 */
export default function Dashboard() {
  const overview = useChildrenOverview();
  const updates = useChildrenUpdates();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="space-y-4">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-slate-100">Overview</h1>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <ParentSetupProgressWidget />
            <div className="hidden rounded-lg border border-[#E8EDF3] bg-white p-5 shadow-sm lg:block dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-bold text-[#030E18] dark:text-slate-100">Welcome back</p>
              <p className="mt-1 text-sm text-[#657386] dark:text-slate-400">
                Here&apos;s what&apos;s happening with your child today.
              </p>
            </div>
          </div>

          {overview.isError ? (
            <ErrorState
              error={overview.error}
              onRetry={() => void overview.refetch()}
              title="Couldn't load your overview"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {overview.isPending ? (
                <>
                  <div className="h-28 animate-pulse rounded-xl bg-white dark:bg-slate-900" />
                  <div className="h-28 animate-pulse rounded-xl bg-white dark:bg-slate-900" />
                  <div className="h-28 animate-pulse rounded-xl bg-white dark:bg-slate-900" />
                </>
              ) : (
                <>
                  <StatCard label="Subjects enrolled" value={String(overview.data?.totalSubjects ?? 0)} />
                  <StatCard
                    label="Average grade"
                    value={overview.data?.averageGrade ? String(overview.data.averageGrade) : 'N/A'}
                  />
                  <StatCard label="Average attendance" value={`${overview.data?.averageAttendance ?? 0}%`} />
                </>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-slate-100">Attendance</h2>
            <p className="mt-1 text-gray-500 dark:text-slate-400">Track your child&apos;s attendance with ease.</p>
          </div>
          <div className="overflow-hidden rounded-lg">
            <AttendanceCalendar />
          </div>
        </section>

        {updates.isError ? null : (
          <RecentUpdatesList updates={updates.isPending ? [] : (updates.data ?? [])} />
        )}
      </div>
    </div>
  );
}
