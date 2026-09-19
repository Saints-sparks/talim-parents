/** Tailwind classes for a grade chip. */
export interface GradeColor {
  bg: string;
  text: string;
}

/** The chip colour for each grade the API can send (`GradeLevel`). */
export const GRADE_COLORS: Record<string, GradeColor> = {
  'A+': { bg: 'bg-green-500', text: 'text-white' },
  A: { bg: 'bg-green-400', text: 'text-white' },
  'B+': { bg: 'bg-blue-500', text: 'text-white' },
  B: { bg: 'bg-blue-400', text: 'text-white' },
  'C+': { bg: 'bg-yellow-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-white' },
  'D+': { bg: 'bg-orange-500', text: 'text-white' },
  D: { bg: 'bg-orange-400', text: 'text-white' },
  E: { bg: 'bg-red-400', text: 'text-white' },
  F: { bg: 'bg-red-600', text: 'text-white' },
};

/** Used for a grade the palette does not know, and for "no grade yet". */
export const FALLBACK_GRADE_COLOR: GradeColor = { bg: 'bg-gray-400', text: 'text-white' };

/** The school's grading scale, as `talimBE-V2`'s `getGradeLevel` applies it. */
export const GRADE_LEGEND: ReadonlyArray<{ grade: string; range: string; label: string }> = [
  { grade: 'A+', range: '90–100', label: 'Excellent' },
  { grade: 'A', range: '80–89', label: 'Very Good' },
  { grade: 'B+', range: '75–79', label: 'Good' },
  { grade: 'B', range: '70–74', label: 'Above Average' },
  { grade: 'C+', range: '65–69', label: 'Average' },
  { grade: 'C', range: '60–64', label: 'Below Average' },
  { grade: 'D+', range: '55–59', label: 'Fair' },
  { grade: 'D', range: '50–54', label: 'Poor' },
  { grade: 'E', range: '45–49', label: 'Very Poor' },
  { grade: 'F', range: '0–44', label: 'Fail' },
];

/** The keys of `GradeSummary.distribution`, best grade first, with their chip colour. */
export const DISTRIBUTION_ORDER: ReadonlyArray<{ key: string; label: string; color: string }> = [
  { key: 'APlus', label: 'A+', color: 'bg-green-500' },
  { key: 'A', label: 'A', color: 'bg-green-400' },
  { key: 'BPlus', label: 'B+', color: 'bg-blue-500' },
  { key: 'B', label: 'B', color: 'bg-blue-400' },
  { key: 'CPlus', label: 'C+', color: 'bg-yellow-500' },
  { key: 'C', label: 'C', color: 'bg-yellow-400' },
  { key: 'DPlus', label: 'D+', color: 'bg-orange-500' },
  { key: 'D', label: 'D', color: 'bg-orange-400' },
  { key: 'E', label: 'E', color: 'bg-red-400' },
  { key: 'F', label: 'F', color: 'bg-red-600' },
];

/** The four result views, in tab order. */
export const RESULT_TABS = ['Subject Results', 'Grade Summary', 'Term Progress', 'Assessment Breakdown'] as const;
