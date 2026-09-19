import { useCallback, useState } from 'react';
import {
  fromDateKey,
  shiftDay,
  shiftMonth,
  toDateKey,
  type MonthYear,
} from '../Components/attendance/attendanceDates';

/** How the month's records are laid out. */
export type AttendanceViewMode = 'calendar' | 'list';

/** Where the page is: a month, and a day inside it. */
interface Position extends MonthYear {
  selectedDate: string;
}

/** What {@link useAttendanceMonth} exposes. */
export interface AttendanceMonthState extends MonthYear {
  /** The day open in the detail panel, `YYYY-MM-DD`. */
  selectedDate: string;
  viewMode: AttendanceViewMode;
  /** Today's `YYYY-MM-DD`, computed once so a page left open overnight stays consistent. */
  todayKey: string;
  setViewMode: (mode: AttendanceViewMode) => void;
  /** Opens a day, moving to its month when it is outside the one shown. */
  selectDate: (dateKey: string) => void;
  /** Steps to the previous or next month and opens its first day. */
  moveMonth: (direction: 1 | -1) => void;
  /** Steps the open day by one, rolling into a neighbouring month when needed. */
  moveDay: (direction: 1 | -1) => void;
  /** Jumps to a month and opens its first day (the month/year pickers). */
  goToMonth: (month: number, year: number) => void;
}

/**
 * The attendance page's navigation state: which month is shown, which day is
 * open, and calendar vs list. Kept out of the page so the page is layout only,
 * and so the day/month arithmetic has one home.
 *
 * Every way of changing the month (arrows, pickers, stepping a day across a
 * month boundary) leaves the open day inside the month on screen — the old
 * pickers changed the month but left the panel describing a day in another.
 *
 * @returns The state and its transitions.
 */
export function useAttendanceMonth(): AttendanceMonthState {
  const [today] = useState(() => new Date());
  const todayKey = toDateKey(today);
  const [position, setPosition] = useState<Position>({
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    selectedDate: todayKey,
  });
  const [viewMode, setViewMode] = useState<AttendanceViewMode>('calendar');

  const selectDate = useCallback((dateKey: string) => {
    const date = fromDateKey(dateKey);
    setPosition({ month: date.getMonth() + 1, year: date.getFullYear(), selectedDate: dateKey });
  }, []);

  const goToMonth = useCallback((month: number, year: number) => {
    setPosition({ month, year, selectedDate: toDateKey(new Date(year, month - 1, 1)) });
  }, []);

  const moveMonth = useCallback((direction: 1 | -1) => {
    setPosition((current) => {
      const next = shiftMonth(current, direction);
      return { ...next, selectedDate: toDateKey(new Date(next.year, next.month - 1, 1)) };
    });
  }, []);

  const moveDay = useCallback((direction: 1 | -1) => {
    setPosition((current) => {
      const selectedDate = shiftDay(current.selectedDate, direction);
      const date = fromDateKey(selectedDate);
      return { month: date.getMonth() + 1, year: date.getFullYear(), selectedDate };
    });
  }, []);

  return {
    month: position.month,
    year: position.year,
    selectedDate: position.selectedDate,
    viewMode,
    todayKey,
    setViewMode,
    selectDate,
    moveMonth,
    moveDay,
    goToMonth,
  };
}
