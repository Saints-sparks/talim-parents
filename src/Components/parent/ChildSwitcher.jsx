import React from "react";
import { getChildId, getChildName } from "./parentUtils";

export default function ChildSwitcher({ children = [], selectedChild, onChange, disabled = false }) {
  return (
    <select
      disabled={disabled || !children.length}
      value={getChildId(selectedChild) || ""}
      onChange={(event) => onChange?.(children.find((child) => getChildId(child) === event.target.value))}
      className="h-11 rounded-xl border border-[#DCE5F2] bg-white px-4 text-sm font-extrabold text-[#0A4EA3] shadow-sm"
    >
      <option value="">Change Child</option>
      {children.map((child) => (
        <option key={getChildId(child)} value={getChildId(child)}>
          {getChildName(child)}
        </option>
      ))}
    </select>
  );
}
