/* eslint-disable react/prop-types */
import { ArrowRight, Camera, Info, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../../services/auth.services";
import { useSchool } from "../../hooks/useSchools";
import { useParentOnboarding } from "../../contexts/ParentOnboardingContext";
import ParentOnboardingLayout from "./ParentOnboardingLayout";
import { getInitials } from "./onboardingUtils";

export default function ParentProfileConfirmStep() {
  const inputRef = useRef(null);
  const { user, updateUser } = useAuth();
  const { school, loading: schoolLoading } = useSchool();
  const { markStepComplete } = useParentOnboarding();
  const [preview, setPreview] = useState(user?.userAvatar || "");

  const parentName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Not set";

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    updateUser({ userAvatar: url });
  };

  const handleContinue = () => {
    markStepComplete("parent-profile");
  };

  return (
    <ParentOnboardingLayout stepLabel="Step 1 of 8">
      <div>
        <h1 className="text-xl font-bold text-[#030E18] dark:text-slate-100">Let’s confirm your profile</h1>
        <p className="mt-2 text-sm text-[#657386] dark:text-slate-300">Please review your information to continue.</p>

        <section className="mt-6 rounded-lg border border-[#E8EDF3] bg-white p-4 dark:border-[#2a3a5a] dark:bg-[#1a2540] sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#EAF2FB] dark:bg-[#1e2d47]">
              {preview ? (
                <img src={preview} alt={parentName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[#003366] dark:text-[#93c5fd]">
                  {user ? getInitials(user) : <UserRound className="h-9 w-9" />}
                </div>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-[#003366] text-white shadow-sm"
                aria-label="Upload parent avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <InfoField label="Full name" value={parentName} />
              <InfoField label="Email address" value={user?.email || "Not set"} />
              <InfoField label="Phone number" value={user?.phoneNumber || "Not set"} />
              <InfoField label="School" value={schoolLoading ? "Loading..." : school?.name || user?.schoolName || "School not set"} />
              <InfoField label="Account status" value="Active" accent />
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-lg bg-[#F2F6FB] px-3 py-3 text-xs text-[#184674] dark:bg-[#0e2040] dark:text-[#93c5fd]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Some profile details are managed by your school and cannot be changed.</span>
          </div>
        </section>

        <button
          onClick={handleContinue}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#003366] text-sm font-semibold text-white hover:bg-[#002244]"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </ParentOnboardingLayout>
  );
}

function InfoField({ label, value, accent }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#7B8794] dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent ? "text-green-600 dark:text-green-400" : "text-[#17212B] dark:text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}
