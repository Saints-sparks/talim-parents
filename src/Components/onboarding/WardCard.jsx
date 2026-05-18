/* eslint-disable react/prop-types */
import { CheckCircle2 } from "lucide-react";
import { getAvatarUrl, getInitials, getPersonName, getStudentClassLabel } from "./onboardingUtils";

export default function WardCard({ ward, selected, onSelect }) {
  const avatarUrl = getAvatarUrl(ward);
  const name = getPersonName(ward);

  return (
    <button
      type="button"
      onClick={() => onSelect(ward)}
      className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-[#1D66D1] bg-[#F7FAFF]"
          : "border-[#E8EDF3] bg-white hover:border-[#B7C7DA]"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-[#1D66D1] bg-[#1D66D1]" : "border-[#A7B1BE]"
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#EAF2FB]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#003366]">
            {getInitials(ward)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#17212B]">{name}</p>
        <p className="mt-1 text-xs text-[#657386]">{getStudentClassLabel(ward)}</p>
        <span className="mt-2 inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
          {ward?.status || "Active"}
        </span>
      </div>

      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1D66D1]" />}
    </button>
  );
}
