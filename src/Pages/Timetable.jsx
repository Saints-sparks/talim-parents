import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../lib/ui/avatar";
import TimetableGrid from "../Components/parent/TimetableGrid";
import TimetableListView from "../Components/parent/TimetableListView";
import TodayScheduleCard from "../Components/parent/TodayScheduleCard";
import ClassInformationCard from "../Components/parent/ClassInformationCard";
import { EmptyTimetableState } from "../Components/parent/EmptyStates";
import ChildSwitcher from "../Components/parent/ChildSwitcher";
import { getChildId, getChildMeta, getChildName, getInitials } from "../Components/parent/parentUtils";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";
import { useParentOnboarding } from "../contexts/ParentOnboardingContext";
import { downloadChildTimetable, getChildTimetable } from "../services/parent.services";
import { toast } from "../Components/CustomToast";

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date) => {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

export default function Timetable() {
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();
  const { wards, wardsLoading } = useParentOnboarding();
  const [view, setView] = useState("weekly");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!selectedStudent && wards.length) updateSelectedStudent(wards.find((child) => child.isDefault) || wards[0]);
  }, [selectedStudent, updateSelectedStudent, wards]);

  const childId = getChildId(selectedStudent);
  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    const format = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
    return `${format(weekStart)} - ${format(end)}, ${end.getFullYear()}`;
  }, [weekStart]);

  useEffect(() => {
    if (!childId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    getChildTimetable(childId, { weekStart: toIsoDate(weekStart), view })
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.message || err.message || "Failed to fetch timetable");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [childId, view, weekStart]);

  const handleDownload = async () => {
    if (!childId) return;
    setDownloading(true);
    try {
      const blob = await downloadChildTimetable(childId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `timetable-${childId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Timetable downloaded successfully.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download timetable.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div data-guide="timetable-header" className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#101828] md:text-3xl">Timetable</h1>
          <p className="mt-1 text-sm font-medium text-[#667085] md:text-base">View your child’s class schedule.</p>
        </div>
        <button type="button" onClick={handleDownload} disabled={!childId || downloading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003366] px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#0A4EA3] disabled:cursor-not-allowed disabled:opacity-60">
          {downloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Timetable
        </button>
      </div>

      <div data-guide="timetable-child">
        <SelectedChildCard selectedStudent={selectedStudent} wards={wards} wardsLoading={wardsLoading} onChange={updateSelectedStudent} />
      </div>

      {!selectedStudent ? (
        <EmptyTimetableState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-5">
            <div data-guide="timetable-controls" className="rounded-2xl border border-[#E5EAF2] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="inline-flex rounded-xl bg-[#F4F7FB] p-1">
                  {["weekly", "list"].map((item) => (
                    <button key={item} type="button" onClick={() => setView(item)} className={`rounded-lg px-4 py-2 text-sm font-extrabold ${view === item ? "bg-white text-[#0A4EA3] shadow-sm" : "text-[#667085]"}`}>
                      {item === "weekly" ? "Weekly View" : "List View"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setWeekStart((date) => addDays(date, -7))} className="rounded-xl border border-[#DCE5F2] p-2 text-[#344054] hover:bg-[#F8FAFD]"><ChevronLeft className="h-5 w-5" /></button>
                  <div className="rounded-xl border border-[#DCE5F2] px-4 py-2 text-sm font-extrabold text-[#344054]">{weekLabel}</div>
                  <button type="button" onClick={() => setWeekStart((date) => addDays(date, 7))} className="rounded-xl border border-[#DCE5F2] p-2 text-[#344054] hover:bg-[#F8FAFD]"><ChevronRight className="h-5 w-5" /></button>
                </div>
              </div>
            </div>

            {loading ? (
              <TimetableSkeleton />
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-extrabold text-[#101828]">Failed to fetch timetable</h2>
                <p className="mt-2 text-sm text-[#667085]">{error}</p>
              </div>
            ) : !data?.timetableSlots?.length ? (
              <EmptyTimetableState />
            ) : view === "weekly" ? (
              <div data-guide="timetable-grid">
                <TimetableGrid slots={data.timetableSlots} weekDays={data.weekDays} />
              </div>
            ) : (
              <div data-guide="timetable-grid">
                <TimetableListView grouped={data.listView || []} />
              </div>
            )}

            <p className="mx-auto w-fit rounded-xl bg-[#F4F7FB] px-4 py-2 text-center text-sm font-semibold text-[#667085]">
              Timetable is subject to change. Please check regularly for updates.
            </p>
          </main>
          <aside data-guide="timetable-sidecards" className="space-y-5">
            <TodayScheduleCard schedule={data?.todaySchedule || []} />
            <ClassInformationCard info={data?.classInformation || { schoolName: selectedStudent?.schoolName }} />
          </aside>
        </div>
      )}
    </div>
  );
}

function SelectedChildCard({ selectedStudent, wards, wardsLoading, onChange }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[#E5EAF2] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={selectedStudent?.avatar || selectedStudent?.userId?.userAvatar} alt={getChildName(selectedStudent)} />
          <AvatarFallback className="bg-[#EAF2FB] font-extrabold text-[#003366]">{getInitials(getChildName(selectedStudent))}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-extrabold text-[#101828]">{selectedStudent ? getChildName(selectedStudent) : "Select child"}</h2>
          <p className="text-sm font-semibold text-[#667085]">{selectedStudent ? getChildMeta(selectedStudent) : "Choose a linked child"}</p>
          {selectedStudent?.schoolName && <p className="text-sm text-[#667085]">{selectedStudent.schoolName}</p>}
        </div>
      </div>
      <ChildSwitcher children={wards} selectedChild={selectedStudent} onChange={onChange} disabled={wardsLoading} />
    </section>
  );
}

function TimetableSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#EEF2F7]" />
      <div className="mt-5 grid grid-cols-4 gap-3">
        {Array.from({ length: 16 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-[#F4F7FB]" />)}
      </div>
    </div>
  );
}
