/**
 * The green completion bar shared by the setup checklist and the dashboard widget.
 *
 * @param props - Component props.
 * @param props.percent - 0 to 100.
 * @param props.animated - Whether width changes ease in.
 * @returns The bar.
 */
export default function SetupProgressBar({ percent, animated = false }: { percent: number; animated?: boolean }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label="Setup progress"
      className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
    >
      <div
        className={`h-full rounded-full bg-green-500 ${animated ? 'transition-all' : ''}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
