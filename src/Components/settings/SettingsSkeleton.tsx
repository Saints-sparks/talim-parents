import { SkeletonBlock } from '../StateComponents';

/**
 * What the Settings page shows while its data loads: the header and four cards,
 * so the layout does not jump when the content arrives.
 *
 * @returns The skeleton.
 */
export function SettingsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading settings">
      <div data-guide="settings-header" className="mb-6">
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="mt-2 h-4 w-72" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((card) => (
          <SkeletonBlock key={card} className="h-56" />
        ))}
      </div>
    </div>
  );
}
