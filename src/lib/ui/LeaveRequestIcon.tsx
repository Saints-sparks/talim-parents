/**
 * The "leave request" glyph: a calendar with a cross through it. It takes its
 * colour from the surrounding text, so it follows the active/inactive state of
 * a menu link like the other icons do.
 *
 * @param props - Component props.
 * @param props.size - Width and height in px.
 * @param props.color - Stroke colour; defaults to the inherited text colour.
 * @param props.className - Extra classes for the `<svg>`.
 * @returns The icon.
 */
export default function LeaveRequestIcon({
  size = 24,
  color = 'currentColor',
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Calendar outline */}
      <rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="2" />
      {/* Top bars (the tabs on the calendar) */}
      <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* The cross inside the calendar */}
      <line x1="9.5" y1="11.5" x2="14.5" y2="16.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="14.5" y1="11.5" x2="9.5" y2="16.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
