import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAttendanceMonth } from '../useAttendanceMonth';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 18, 10, 0, 0)); // 18 March 2026
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useAttendanceMonth', () => {
  it('opens today, in calendar view', () => {
    const { result } = renderHook(() => useAttendanceMonth());
    expect(result.current).toMatchObject({ month: 3, year: 2026, selectedDate: '2026-03-18', viewMode: 'calendar' });
    expect(result.current.todayKey).toBe('2026-03-18');
  });

  it('moving a month opens its first day, across a year boundary', () => {
    const { result } = renderHook(() => useAttendanceMonth());
    act(() => result.current.goToMonth(12, 2026));
    act(() => result.current.moveMonth(1));
    expect(result.current).toMatchObject({ month: 1, year: 2027, selectedDate: '2027-01-01' });
    act(() => result.current.moveMonth(-1));
    expect(result.current).toMatchObject({ month: 12, year: 2026, selectedDate: '2026-12-01' });
  });

  it('the pickers keep the open day inside the month on screen', () => {
    const { result } = renderHook(() => useAttendanceMonth());
    act(() => result.current.goToMonth(6, 2025));
    expect(result.current).toMatchObject({ month: 6, year: 2025, selectedDate: '2025-06-01' });
  });

  it('stepping a day past the end of the month follows it into the next', () => {
    const { result } = renderHook(() => useAttendanceMonth());
    act(() => result.current.selectDate('2026-03-31'));
    act(() => result.current.moveDay(1));
    expect(result.current).toMatchObject({ month: 4, year: 2026, selectedDate: '2026-04-01' });
    act(() => result.current.moveDay(-1));
    expect(result.current).toMatchObject({ month: 3, year: 2026, selectedDate: '2026-03-31' });
  });

  it('opening a day in another month (a recent record) moves to that month', () => {
    const { result } = renderHook(() => useAttendanceMonth());
    act(() => result.current.selectDate('2026-02-27'));
    expect(result.current).toMatchObject({ month: 2, year: 2026, selectedDate: '2026-02-27' });
  });

  it('opening a day in the same month does not move the month', () => {
    const { result } = renderHook(() => useAttendanceMonth());
    act(() => result.current.selectDate('2026-03-02'));
    expect(result.current).toMatchObject({ month: 3, year: 2026, selectedDate: '2026-03-02' });
  });
});
