/**
 * B5 report card and B8 parent acknowledgement. Hand-written; see `./common.ts`
 * for how to swap these for the generated contract.
 */
import type { ClassRef, GradeBand, Position, TermRef } from './common';

/** Whether a term's results exist yet (B5). */
export type ReportStatus = 'none' | 'partial' | 'published';

/** One assessment column (1st CA / 20, Exam / 60…), from the school's set-up. */
export interface ReportColumn {
  id: string;
  name: string;
  maxScore: number;
}

/** A course on the report. CONTRACT GAP: only `course` is named; this is what the rows read. */
export interface ReportCourse {
  id: string;
  title: string;
  short?: string | null;
  colourKey?: string | null;
}

/** One subject row: a score per column (null when not yet published). */
export interface ReportRow {
  course: ReportCourse;
  scores: (number | null)[];
  total: number | null;
  percent: number | null;
  grade: string | null;
  position: Position | null;
  classAverage: number | null;
}

/** The strongest or weakest subject. CONTRACT GAP: the item shape is not named. */
export interface ReportHighlight {
  course: ReportCourse;
  percent: number;
  position?: Position | null;
}

/** `GET /parents/me/children/:childId/report-card?termId=` (B5). */
export interface ReportCard {
  status: ReportStatus;
  issuedAt: string | null;
  school: { name: string; logoUrl: string | null; address: string | null; phone: string | null; email: string | null };
  student: { name: string; admissionNumber: string | null; class: ClassRef | null };
  term: TermRef;
  session: string | null;
  /** The next term's start date. */
  nextTermStart: string | null;
  columns: ReportColumn[];
  rows: ReportRow[];
  overall: { percent: number | null; grade: string | null; position: Position | null; previousPosition: Position | null };
  strongest: ReportHighlight | null;
  weakest: ReportHighlight | null;
  scale: GradeBand[];
  passMark: number;
  attendance: { schoolDays: number; present: number; late: number; absent: number; excused: number };
  /** Present only once the term results are published. */
  remarks: { classTeacher: string | null; principal: string | null; classTeacherName: string | null } | null;
  acknowledgedAt: string | null;
}

/** One entry of `GET .../report-card/terms` (B5): the terms that have results. */
export interface ReportTerm {
  id: string;
  name: string;
  session: string | null;
  status: ReportStatus;
  /** CONTRACT GAP: whether this is the current term (the "live" state). */
  isCurrent?: boolean;
  /** CONTRACT GAP: when the term closed, for "Archived report · closed …". */
  endDate?: string | null;
}

/** `POST /parents/me/children/:childId/report-card/acknowledge` (B8). */
export interface AcknowledgeResult {
  acknowledgedAt: string;
}
