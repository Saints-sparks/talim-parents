import { Fragment } from 'react';

/** Which placeholder layout to draw. `custom` is a single bare bar (a table cell). */
export type SkeletonType = 'card' | 'table' | 'custom';

/** One block of a placeholder layout. */
interface SkeletonBlock {
  w: string;
  h: string;
  rounded?: 'full' | false;
}

const skeletonConfigs: Record<Exclude<SkeletonType, 'custom'>, SkeletonBlock[]> = {
  card: [
    { w: '100%', h: '15rem', rounded: false }, // main block (image/header)
    { w: '75%', h: '1.25rem' }, // title
    { w: '100%', h: '1rem' }, // subtitle
    { w: '83.33%', h: '1rem' }, // description
    { w: '25%', h: '0.75rem' }, // small tag left
    { w: '2rem', h: '2rem', rounded: 'full' }, // circle avatar
  ],
  table: [
    { w: '100%', h: '3rem' }, // header row
    { w: '100%', h: '2.5rem' }, // row 1
    { w: '100%', h: '2.5rem' }, // row 2
    { w: '100%', h: '2.5rem' }, // row 3
    { w: '100%', h: '2.5rem' }, // row 4
  ],
};

interface BaseSkeletonProps {
  height: string;
  width: string;
  rounded?: 'full' | false;
  className?: string;
}

/**
 * One shimmering block.
 *
 * @param props - Size, shape and any extra classes.
 * @returns The block.
 */
function BaseSkeleton({ height, width, rounded, className = '' }: BaseSkeletonProps) {
  const shape = rounded === 'full' ? 'rounded-full' : rounded === false ? '' : 'rounded-lg';
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-gray-200 dark:bg-slate-700 ${shape} ${className}`}
      style={{ height, width }}
    >
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
    </div>
  );
}

/** Props of {@link SkeletonLoader}. */
export interface SkeletonLoaderProps {
  type?: SkeletonType;
  /** How many placeholders to draw. */
  count?: number;
  /** Extra classes: on the card for `card`/`table`, on the bar for `custom`. */
  className?: string;
  /** Overrides every block's height. */
  height?: string;
  /** Overrides every block's width. */
  width?: string;
}

/**
 * Shimmering loading placeholders.
 *
 * @param props - Layout type, count and optional size overrides.
 * @returns `count` placeholders.
 */
export default function SkeletonLoader({
  type = 'card',
  count = 1,
  className = '',
  height,
  width,
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count }, (_, index) => index);

  if (type === 'custom') {
    return (
      <>
        {items.map((index) => (
          <BaseSkeleton key={index} height={height ?? '1rem'} width={width ?? '100%'} className={className} />
        ))}
      </>
    );
  }

  const blocks = skeletonConfigs[type] ?? skeletonConfigs.card;

  return (
    <>
      {items.map((index) => (
        <Fragment key={index}>
          <div
            className={`overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900 ${
              type === 'table' ? 'p-4' : 'space-y-3 p-5'
            } ${className}`}
          >
            {blocks.map((block, blockIndex) => (
              <BaseSkeleton
                key={blockIndex}
                height={height ?? block.h}
                width={width ?? block.w}
                rounded={block.rounded}
              />
            ))}
          </div>
        </Fragment>
      ))}
    </>
  );
}
