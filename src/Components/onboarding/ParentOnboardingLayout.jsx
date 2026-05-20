/* eslint-disable react/prop-types */
import logo from "../../assets/logo.svg";

export default function ParentOnboardingLayout({ children, stepLabel, onContactSchool }) {
  return (
    <div className="min-h-screen bg-white px-4 py-6 font-manrope dark:bg-[#17233C] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Talim" className="h-8 w-8" />
            <span className="text-sm font-bold text-[#030E18] dark:text-slate-100">Talim</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-[#003366]">
            {stepLabel && <span className="text-[#030E18] dark:text-slate-100">{stepLabel}</span>}
            {onContactSchool && (
              <button onClick={onContactSchool} className="hover:underline">
                Need help? Contact School
              </button>
            )}
          </div>
        </div>
        <div className="mx-auto w-full max-w-xl rounded-lg border border-[#E8EDF3] bg-white p-5 shadow-sm dark:border-[#2a3a5a] dark:bg-[#1a2540] sm:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}
