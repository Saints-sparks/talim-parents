/**
 * Seed data for the dev fixtures, taken from the design's `class Component`
 * (TALIM Redesign/Talim Parent Portal.dc.html): the Agbukor family, four
 * children at two schools, their subjects, fees, leave and notifications.
 *
 * Dev and test only. Nothing under `src/dev/` is imported by production code:
 * `main.tsx` loads it behind `import.meta.env.DEV`, so a production build
 * never contains it.
 */

/** The fixtures' "today": the Friday of the design's week, so screens match the mock-ups. */
export const FIXTURE_TODAY = '2026-09-18';

/** The fixtures' clock time today, so lessons are done, now or later. */
export const FIXTURE_NOW = `${FIXTURE_TODAY}T10:30:00.000+01:00`;

/** One school of the family. */
export interface SeedSchool {
  id: string;
  name: string;
  short: string;
  city: string;
  phone: string;
  email: string;
  address: string;
  officeHours: { start: string; end: string };
  bank: { bank: string; name: string; number: string };
  providers: ('paystack' | 'opay' | 'stripe')[];
  minimumPartPayment: number;
  receiptPrefix: string;
}

export const SCHOOLS: Record<string, SeedSchool> = {
  sparks: {
    id: '65f0000000000000000000a1',
    name: 'Easy Sparks Education Center',
    short: 'Easy Sparks',
    city: 'Ikeja, Lagos',
    phone: '+234 802 415 7730',
    email: 'office@easysparks.edu.ng',
    address: '14 Oduduwa Crescent, GRA Ikeja, Lagos',
    officeHours: { start: '08:00', end: '16:00' },
    bank: { bank: 'Zenith Bank', name: 'Easy Sparks Education Center', number: '0123456789' },
    providers: ['paystack', 'opay', 'stripe'],
    minimumPartPayment: 10_000,
    receiptPrefix: 'RCP',
  },
  bright: {
    id: '65f0000000000000000000a2',
    name: 'Brightgate Academy',
    short: 'Brightgate',
    city: 'Gwarinpa, Abuja',
    phone: '+234 809 662 1184',
    email: 'frontdesk@brightgate.edu.ng',
    address: 'Plot 62, 3rd Avenue, Gwarinpa Estate, Abuja',
    officeHours: { start: '07:30', end: '15:30' },
    bank: { bank: 'GTBank', name: 'Brightgate Academy Ltd', number: '0234567891' },
    providers: ['paystack', 'stripe'],
    minimumPartPayment: 15_000,
    receiptPrefix: 'BGA',
  },
};

/** One subject: colour key, title, short name, base score, rank and class average. */
export const SUBJECTS: readonly [string, string, string, number, number, number][] = [
  ['mth', 'Advance Maths', 'Maths', 65, 3, 60],
  ['eng', 'English Language', 'English', 75, 4, 68],
  ['chm', 'Introduction to Chemistry', 'Chem', 62, 6, 64],
  ['bio', 'Biology', 'Bio', 76, 2, 66],
  ['phy', 'Physics', 'Physics', 63, 9, 65],
  ['geo', 'Geography', 'Geo', 73, 5, 67],
  ['civ', 'Civic Education', 'Civic', 83, 1, 71],
  ['bus', 'Business Studies', 'Business', 60, 12, 63],
  ['agr', 'Agricultural Science', 'Agric', 69, 7, 66],
  ['cmp', 'Computer Studies', 'Computer', 84, 1, 72],
  ['yor', 'Yoruba Language', 'Yoruba', 56, 18, 62],
  ['art', 'Creative Arts', 'Arts', 70, 6, 64],
];

/** Each school's teachers, one per subject in {@link SUBJECTS} order. */
export const TEACHERS: Record<string, string[]> = {
  sparks: ['Mr Seyi Tinubu', 'Mrs Abike Dabiri', 'Mr Tunji Salias', 'Mrs Ronke Adeyemi', 'Mr Emeka Obi', 'Miss Halima Bello', 'Mr Saint Agbukor', 'Mrs Grace Eze', 'Mr Yusuf Lawal', 'Miss Chidinma Okafor', 'Mrs Folake Ojo', 'Mr Dapo Ajayi'],
  bright: ['Mrs Ngozi Umeh', 'Mr Ibrahim Danladi', 'Dr Kemi Ogunbiyi', 'Mr Paul Attah', 'Mrs Sarah Mbah', 'Mr Gbenga Alao', 'Mrs Hauwa Sule', 'Mr Chike Nwosu', 'Mrs Titi Balogun', 'Mr Femi Adeoye', 'Mrs Uche Eze', 'Miss Zara Mohammed'],
};

/** One fee item of the catalogue: label, category, due date, breakdown, part payment allowed. */
export interface SeedFee {
  label: string;
  category: string;
  due: string;
  parts: [string, number][];
  allowPartial: boolean;
}

export const FEE_CATALOG: Record<string, SeedFee> = {
  tuition: { label: 'Tuition', category: 'Tuition fee', due: '2026-09-30', parts: [['Class tuition', 0.78], ['Technology levy', 0.12], ['Library access', 0.1]], allowPartial: true },
  hostel: { label: 'Boarding house', category: 'Hostel fee', due: '2026-09-30', parts: [['Bed space', 0.42], ['Feeding', 0.44], ['Laundry', 0.14]], allowPartial: true },
  books: { label: 'Books and stationery', category: 'Materials', due: '2026-09-15', parts: [['Textbooks', 0.68], ['Exercise books', 0.2], ['Stationery', 0.12]], allowPartial: false },
  exam: { label: 'Examination fee', category: 'Examination', due: '2026-10-10', parts: [['Question papers', 0.7], ['Report printing', 0.3]], allowPartial: false },
  uniform: { label: 'Uniform and games kit', category: 'Uniform', due: '2026-09-30', parts: [['Uniform sets', 0.72], ['Games kit', 0.28]], allowPartial: true },
  pta: { label: 'PTA levy', category: 'Levy', due: '2026-11-30', parts: [['PTA dues', 1]], allowPartial: false },
};

/** One child of the family, as the design seeds them. */
export interface SeedChild {
  id: string;
  key: string;
  name: string;
  first: string;
  className: string | null;
  admissionNumber: string;
  school: keyof typeof SCHOOLS;
  /** Shifts every subject score, so each child has their own results. */
  shift: number;
  rank: number;
  of: number;
  previousRank: number | null;
  present: number;
  absent: number;
  late: number;
  leave: number;
  days: number;
  teacherIdx: number;
  relationship: 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';
  /** Fee id to [amount, already paid]. */
  feePlan: Record<string, [number, number]>;
  comment: string;
  isDefault: boolean;
}

export const CHILDREN: readonly SeedChild[] = [
  {
    id: '66a0000000000000000000c1', key: 'musa', name: 'Musa Adele', first: 'Musa', className: 'Jss1 A', admissionNumber: 'TAL/2026/JS1/0148',
    school: 'sparks', shift: 0, rank: 5, of: 28, previousRank: 7, present: 46, absent: 2, late: 1, leave: 2, days: 50, teacherIdx: 6, relationship: 'FATHER',
    feePlan: { tuition: [120000, 90000], books: [26000, 26000], exam: [15000, 0], uniform: [21000, 12000], pta: [8000, 0] },
    comment: 'Musa has settled well into Jss1 A and is strongest in Computer Studies and Civic Education. Steady work on Yoruba Language and Business Studies would lift his average further next term.',
    isDefault: true,
  },
  {
    id: '66a0000000000000000000c2', key: 'aisha', name: 'Aisha Adele', first: 'Aisha', className: 'Jss2 B', admissionNumber: 'TAL/2025/JS2/0091',
    school: 'sparks', shift: -5, rank: 11, of: 30, previousRank: 10, present: 45, absent: 4, late: 1, leave: 1, days: 50, teacherIdx: 3, relationship: 'FATHER',
    feePlan: { tuition: [130000, 65000], hostel: [150000, 0], books: [28000, 0], exam: [15000, 0], uniform: [22000, 22000], pta: [8000, 0] },
    comment: 'Aisha is a careful, thoughtful student whose written work is improving each week. Regular attendance next term will help her close the gap in Mathematics.',
    isDefault: false,
  },
  {
    id: '66a0000000000000000000c3', key: 'zainab', name: 'Zainab Adele', first: 'Zainab', className: 'Jss3 A', admissionNumber: 'BGA/2024/JS3/0317',
    school: 'bright', shift: 4, rank: 2, of: 26, previousRank: 5, present: 48, absent: 1, late: 0, leave: 1, days: 50, teacherIdx: 2, relationship: 'GUARDIAN',
    feePlan: { tuition: [165000, 165000], hostel: [140000, 70000], books: [31000, 31000], exam: [18000, 18000], uniform: [24000, 24000], pta: [10000, 10000] },
    comment: 'Zainab continues to set the standard in the sciences and supports her classmates readily. She should keep an eye on written expression in language subjects.',
    isDefault: false,
  },
  {
    id: '66a0000000000000000000c4', key: 'ibrahim', name: 'Ibrahim Adele', first: 'Ibrahim', className: 'Jss1 B', admissionNumber: 'BGA/2026/JS1/0452',
    school: 'bright', shift: -9, rank: 17, of: 24, previousRank: null, present: 45, absent: 5, late: 2, leave: 0, days: 50, teacherIdx: 10, relationship: 'GUARDIAN',
    feePlan: { tuition: [150000, 50000], books: [29000, 29000], exam: [16000, 0], uniform: [26000, 13000], pta: [10000, 0] },
    comment: 'Ibrahim is still finding his feet after moving schools, and has made friends quickly. Extra reading at home will help him catch up in English and Mathematics.',
    isDefault: false,
  },
];

/** The child a valid link code adds (A11): a new school for the family. */
export const LINKABLE_CHILD: SeedChild = {
  id: '66a0000000000000000000c5', key: 'tobi', name: 'Tobi Adele', first: 'Tobi', className: null, admissionNumber: 'TAL/2026/PRY/0021',
  school: 'sparks', shift: 2, rank: 0, of: 0, previousRank: null, present: 0, absent: 0, late: 0, leave: 0, days: 0, teacherIdx: 0, relationship: 'FATHER',
  feePlan: {}, comment: '', isDefault: false,
};

/** The link codes the fixtures accept: valid, used (409), anything else is 404. */
export const LINK_CODES = { valid: 'ABCD-1234', used: 'USED-0000' } as const;

/** The signed-in parent. */
export const PARENT = {
  id: '65e0000000000000000000p1',
  firstName: 'Saint',
  lastName: 'Agbukor',
  email: 'saint.agbukor@gmail.com',
  phoneNumber: '09075783540',
  address: '14 Olaniyi Street, Ikeja, Lagos',
  occupation: 'Civil servant',
};

/** The weekly grid (rows are the eight periods, columns Monday to Friday). */
export const WEEK_GRID: readonly string[][] = [
  ['mth', 'eng', 'bio', 'phy', 'cmp'],
  ['chm', 'mth', 'eng', 'civ', 'bus'],
  ['eng', 'phy', 'mth', 'geo', 'art'],
  ['bio', 'geo', 'cmp', 'agr', 'agr'],
  ['break', 'break', 'break', 'break', 'break'],
  ['civ', 'yor', 'chm', 'mth', 'phy'],
  ['cmp', 'art', 'bus', 'yor', 'geo'],
  ['bio', 'chm', 'agr', 'art', 'eng'],
];

/** The bell: eight periods, the fifth a break. */
export const PERIODS = [
  { key: 'p1', label: 'Period 1', startTime: '08:00', endTime: '09:00', isBreak: false },
  { key: 'p2', label: 'Period 2', startTime: '09:00', endTime: '10:00', isBreak: false },
  { key: 'p3', label: 'Period 3', startTime: '10:00', endTime: '11:00', isBreak: false },
  { key: 'p4', label: 'Period 4', startTime: '11:00', endTime: '12:00', isBreak: false },
  { key: 'brk', label: 'Break', startTime: '12:00', endTime: '13:00', isBreak: true },
  { key: 'p5', label: 'Period 5', startTime: '13:00', endTime: '14:00', isBreak: false },
  { key: 'p6', label: 'Period 6', startTime: '14:00', endTime: '15:00', isBreak: false },
  { key: 'p7', label: 'Period 7', startTime: '15:00', endTime: '16:00', isBreak: false },
] as const;

/** The terms: the current session's three, then two archived sessions. */
export const TERMS = [
  { id: '67t0000000000000000000t1', name: 'First term', session: '2026 / 2027', startDate: '2026-09-01', endDate: '2026-12-15', isCurrent: true, status: 'partial' as const },
  { id: '67t0000000000000000000t2', name: 'Second term', session: '2026 / 2027', startDate: '2027-01-07', endDate: '2027-04-09', isCurrent: false, status: 'none' as const },
  { id: '67t0000000000000000000t3', name: 'Third term', session: '2026 / 2027', startDate: '2027-04-26', endDate: '2027-07-22', isCurrent: false, status: 'none' as const },
  { id: '67t0000000000000000000t4', name: 'Third term', session: '2025 / 2026', startDate: '2026-04-20', endDate: '2026-07-22', isCurrent: false, status: 'published' as const },
  { id: '67t0000000000000000000t5', name: 'Second term', session: '2025 / 2026', startDate: '2026-01-06', endDate: '2026-04-09', isCurrent: false, status: 'published' as const },
  { id: '67t0000000000000000000t6', name: 'First term', session: '2025 / 2026', startDate: '2025-09-08', endDate: '2025-12-15', isCurrent: false, status: 'published' as const },
] as const;

/** Leave requests per child key, newest first. */
export const LEAVE = [
  { id: '68l0000000000000000000l1', type: 'medical', startDate: '2026-09-24', endDate: '2026-09-24', days: 1, note: 'Dental review at 10am, back before lunch.', status: 'pending', createdAt: '2026-09-17T09:12:00.000Z' },
  { id: '68l0000000000000000000l2', type: 'family_travel', startDate: '2026-09-04', endDate: '2026-09-07', days: 2, note: "Grandmother's burial in Abeokuta.", status: 'approved', createdAt: '2026-08-30T10:00:00.000Z' },
  { id: '68l0000000000000000000l3', type: 'illness', startDate: '2026-08-22', endDate: '2026-08-22', days: 1, note: 'Malaria, seen at Reddington Clinic.', status: 'approved', createdAt: '2026-08-22T07:30:00.000Z' },
  { id: '68l0000000000000000000l4', type: 'other', startDate: '2026-08-12', endDate: '2026-08-12', days: 1, note: 'Family event, submitted late.', status: 'declined', createdAt: '2026-08-12T06:00:00.000Z' },
] as const;
