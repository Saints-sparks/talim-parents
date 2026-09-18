import { childFullName, childRecordId, type ParentChild } from '../../types/parent';

/**
 * A select that switches which linked child the rest of the page is showing.
 *
 * @param props - Component props.
 * @param props.children - The parent's linked children.
 * @param props.selectedChild - The child currently shown.
 * @param props.onChange - Called with the newly chosen child.
 * @param props.disabled - Disables the control while data is loading.
 * @returns The switcher.
 */
export default function ChildSwitcher({
  children = [],
  selectedChild,
  onChange,
  disabled = false,
}: {
  children?: ParentChild[];
  selectedChild?: ParentChild | null;
  onChange?: (child: ParentChild | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label="Switch child"
      disabled={disabled || children.length === 0}
      value={childRecordId(selectedChild) ?? ''}
      onChange={(event) =>
        onChange?.(children.find((child) => childRecordId(child) === event.target.value))
      }
      className="h-11 rounded-xl border border-[#DCE5F2] bg-white px-4 text-sm font-extrabold text-[#0A4EA3] shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300"
    >
      <option value="">Change child</option>
      {children.map((child) => (
        <option key={childRecordId(child)} value={childRecordId(child)}>
          {childFullName(child)}
        </option>
      ))}
    </select>
  );
}
