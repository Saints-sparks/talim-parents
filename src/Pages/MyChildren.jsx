import React, { useEffect, useMemo, useState } from "react";
import { Info, Plus, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChildCard from "../Components/parent/ChildCard";
import ChildrenOverviewCards from "../Components/parent/ChildrenOverviewCards";
import RecentUpdatesList from "../Components/parent/RecentUpdatesList";
import ParentQuickActions from "../Components/parent/ParentQuickActions";
import { EmptyChildrenState } from "../Components/parent/EmptyStates";
import { getChildId, getChildName, getChildUserId } from "../Components/parent/parentUtils";
import { useParentOnboarding } from "../contexts/ParentOnboardingContext";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";
import { getParentChildrenOverview, getParentChildrenUpdates, setDefaultChild } from "../services/parent.services";
import { toast } from "../Components/CustomToast";

export default function MyChildren() {
  const navigate = useNavigate();
  const { wards, wardsLoading, wardsError, refreshWards } = useParentOnboarding();
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();
  const [overview, setOverview] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [savingDefault, setSavingDefault] = useState(false);

  useEffect(() => {
    refreshWards();
  }, [refreshWards]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([getParentChildrenOverview(), getParentChildrenUpdates()]).then(([overviewResult, updatesResult]) => {
      if (!mounted) return;
      if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
      if (updatesResult.status === "fulfilled") setUpdates(updatesResult.value?.updates || updatesResult.value || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedId = getChildId(selectedStudent);
  const overviewData = useMemo(() => {
    if (overview) return overview;
    const attendanceValues = wards.map((child) => Number(child.attendancePercentage || 0)).filter((value) => value > 0);
    const totalSubjects = wards.reduce((sum, child) => sum + Number(child.subjectsCount || 0), 0);
    return {
      totalChildren: wards.length,
      averageAttendance: attendanceValues.length ? Math.round(attendanceValues.reduce((a, b) => a + b, 0) / attendanceValues.length) : 0,
      averageGrade: wards.find((child) => child.currentGradeSummary)?.currentGradeSummary || "N/A",
      totalSubjects,
    };
  }, [overview, wards]);

  const handleSetDefault = async (child) => {
    const childId = getChildId(child);
    if (!childId || savingDefault) return;
    setSavingDefault(true);
    updateSelectedStudent(child);
    try {
      await setDefaultChild(childId);
      toast.success(`${getChildName(child)} is now your primary child.`);
      await refreshWards();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not set primary child.");
    } finally {
      setSavingDefault(false);
    }
  };

  if (wardsLoading && !wards.length) {
    return (
      <div className="space-y-6">
        <PageTop />
        <div className="grid gap-5 xl:grid-cols-2">
          {[1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />)}
        </div>
      </div>
    );
  }

  if (wardsError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-extrabold text-[#101828]">Failed to fetch children</h1>
        <p className="mt-2 text-sm text-[#667085]">{wardsError}</p>
        <button onClick={refreshWards} className="mt-5 rounded-xl bg-[#003366] px-5 py-3 text-sm font-extrabold text-white">Try Again</button>
      </div>
    );
  }

  if (!wards.length) {
    return (
      <div className="space-y-6">
        <PageTop />
        <EmptyChildrenState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTop />

      <div className="grid gap-5 xl:grid-cols-2">
        {wards.map((child) => {
          const childId = getChildId(child);
          const isSelected = child?.isDefault || childId === selectedId || getChildUserId(child) === getChildUserId(selectedStudent);
          return (
            <ChildCard
              key={childId}
              child={child}
              selected={isSelected}
              onSelect={handleSetDefault}
              onViewProfile={() => navigate("/profile")}
            />
          );
        })}
      </div>

      <ChildrenOverviewCards overview={overviewData} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <RecentUpdatesList updates={updates} />
        <div className="space-y-5">
          <ParentQuickActions />
          <div className="flex gap-3 rounded-2xl bg-[#EAF2FF] p-5 text-[#0A4EA3]">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold text-[#344054]">
              <span className="block font-extrabold text-[#0A4EA3]">Need help?</span>
              If you can’t find your child or see incorrect information, please contact your school administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageTop() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[#0A4EA3]">
          <UsersRound className="h-5 w-5" />
          <span className="text-sm font-extrabold">Parent Dashboard</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-[#101828] md:text-3xl">My Children</h1>
        <p className="mt-1 text-sm font-medium text-[#667085] md:text-base">View and manage your children linked to your account.</p>
      </div>
      <button type="button" onClick={() => navigate("/onboarding")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003366] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A4EA3]">
        <Plus className="h-4 w-4" /> Link Another Child
      </button>
    </div>
  );
}
