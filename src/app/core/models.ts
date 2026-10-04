export type Status = 'wishlist' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'ghosted';

export const STATUSES: { id: Status; label: string }[] = [
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'applied', label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'ghosted', label: 'Ghosted' },
];

export const statusLabel = (s: Status): string => STATUSES.find((x) => x.id === s)?.label ?? s;

/** Statuses where the ball is still in play (used by follow-up and ghosted rules). */
export const OPEN_STATUSES: Status[] = ['applied', 'screening', 'interview', 'offer'];

export type WorkMode = 'onsite' | 'hybrid' | 'remote';

export const SOURCES = ['LinkedIn', 'Referral', 'Company site', 'Indeed', 'Wellfound', 'Recruiter', 'Other'];

export interface StatusChange {
  status: Status;
  /** ISO date-time of the change. */
  date: string;
}

export interface Contact {
  name: string;
  role?: string;
  email?: string;
}

export interface Interview {
  id: string;
  /** ISO date-time of the start. */
  date: string;
  kind: string;
  durationMin: number;
  notes?: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  link: string;
  location: string;
  workMode: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  source: string;
  status: Status;
  /** Every status the application has been in, oldest first. The last entry matches `status`. */
  history: StatusChange[];
  contacts: Contact[];
  notes: string;
  nextAction: string;
  /** YYYY-MM-DD */
  nextActionDate?: string;
  interviews: Interview[];
  /** ISO date-time of the last follow-up you sent. */
  lastContacted?: string;
  jobDescription?: string;
  matchScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  title: string;
  company: string;
  period: string;
  bullets: string[];
}

/** The resume, parsed into the parts the matcher and the letter writer need. */
export interface Profile {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: string[];
  rawText: string;
}

export const DAY = 86_400_000;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Local YYYY-MM-DD for a date. */
export function ymd(d: Date | string | number): string {
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

/** Whole days between two instants (b - a), rounded down. */
export function daysBetween(a: string | number | Date, b: string | number | Date): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY);
}

/** Date of the first time an application entered a status, if ever. */
export function enteredAt(app: Application, status: Status): string | undefined {
  return app.history.find((h) => h.status === status)?.date;
}

/** The latest moment something happened: a status change, a follow-up or a past interview. */
export function lastActivity(app: Application, now = Date.now()): string {
  const dates = [
    ...app.history.map((h) => h.date),
    app.lastContacted,
    ...app.interviews.map((i) => i.date).filter((d) => new Date(d).getTime() <= now),
  ].filter((d): d is string => !!d);
  if (!dates.length) return app.createdAt;
  return dates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
}
