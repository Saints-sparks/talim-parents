import { FALLBACK_GRADE_COLOR, GRADE_COLORS } from './gradeStyles';

/**
 * A coloured chip for a letter grade.
 *
 * @param props - Component props.
 * @param props.grade - The grade (`A+` … `F`), or nothing when none is recorded.
 * @returns The chip.
 */
export default function GradeBadge({ grade }: { grade: string | null | undefined }) {
  const colors = (grade && GRADE_COLORS[grade]) || FALLBACK_GRADE_COLOR;
  return (
    <span
      className={`inline-flex min-w-[36px] items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${colors.bg} ${colors.text}`}
    >
      {grade || '—'}
    </span>
  );
}
