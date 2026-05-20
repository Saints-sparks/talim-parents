import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileBadge,
  MessageSquareText,
  UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PARENT_ONBOARDING_STEPS,
  useParentOnboarding,
} from "../../contexts/ParentOnboardingContext";
import ParentOnboardingLayout from "./ParentOnboardingLayout";
import SetupChecklistItem from "./SetupChecklistItem";

const ICONS = {
  "select-ward": <UserCheck className="h-4 w-4" />,
  "view-notifications": <Bell className="h-4 w-4" />,
  "view-attendance": <CalendarCheck className="h-4 w-4" />,
  "view-timetable": <CalendarDays className="h-4 w-4" />,
  "view-results": <FileBadge className="h-4 w-4" />,
  "request-leave": <ClipboardList className="h-4 w-4" />,
  "open-messages": <MessageSquareText className="h-4 w-4" />,
};

export default function ParentSetupChecklist() {
  const navigate = useNavigate();
  const {
    completedCount,
    totalCount,
    progressPercent,
    isStepComplete,
    markStepComplete,
    isFullyComplete,
  } = useParentOnboarding();

  const visibleSteps = PARENT_ONBOARDING_STEPS.filter((step) => step.id !== "parent-profile");

  const openStep = (step) => {
    markStepComplete(step.id);
    navigate(step.href);
  };

  return (
    <ParentOnboardingLayout stepLabel="Step 3 of 8">
      <div>
        <h1 className="text-xl font-bold text-[#030E18] dark:text-slate-100">Complete your parent setup</h1>
        <p className="mt-2 text-sm text-[#657386] dark:text-slate-300">
          Follow the steps below to get the most out of Talim.
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#657386] dark:text-slate-300">
              {completedCount} / {totalCount} Completed
            </span>
            <span className="text-[#003366] dark:text-[#93c5fd]">{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E9EEF4]">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {visibleSteps.map((step) => (
            <SetupChecklistItem
              key={step.id}
              icon={ICONS[step.id]}
              title={step.label}
              description={step.description}
              completed={isStepComplete(step.id)}
              disabled={isStepComplete(step.id)}
              onClick={() => openStep(step)}
            />
          ))}
          <SetupChecklistItem
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Setup Complete"
            description={isFullyComplete ? "You’re all set to use Talim!" : "Finish the remaining setup steps."}
            completed={isFullyComplete}
            disabled
          />
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#003366] text-sm font-semibold text-white hover:bg-[#002244]"
        >
          Go to Dashboard
        </button>
      </div>
    </ParentOnboardingLayout>
  );
}
