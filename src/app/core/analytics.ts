import { Application, DAY, OPEN_STATUSES, Status, daysBetween, enteredAt, lastActivity, ymd } from './models';

export const FUNNEL: Status[] = ['applied', 'screening', 'interview', 'offer'];

/** Furthest funnel stage an application reached (-1 = never applied). */
export function furthestStage(app: Application): number {
  return Math.max(-1, ...app.history.map((h) => FUNNEL.indexOf(h.status)));
}

export interface FunnelStep {
  status: Status;
  count: number;
  /** Share of the previous step that reached this one (1 for the first step). */
  conversion: number;
  /** Share of all applications that reached this step. */
  overall: number;
}

/** applied → screening → interview → offer, counting every application that ever reached each stage. */
export function funnel(apps: Application[]): FunnelStep[] {
  const counts = FUNNEL.map((_, i) => apps.filter((a) => furthestStage(a) >= i).length);
  return FUNNEL.map((status, i) => ({
    status,
    count: counts[i],
    conversion: i === 0 ? (counts[0] ? 1 : 0) : counts[i - 1] ? counts[i] / counts[i - 1] : 0,
    overall: counts[0] ? counts[i] / counts[0] : 0,
  }));
}

/** A reply of any kind: moved forward, or an explicit rejection. Ghosting is not a response. */
export function gotResponse(app: Application): boolean {
  return furthestStage(app) >= 1 || app.history.some((h) => h.status === 'rejected');
}

export interface SourceRate {
  source: string;
  applied: number;
  responded: number;
  rate: number;
}

export function responseRateBySource(apps: Application[]): SourceRate[] {
  const map = new Map<string, SourceRate>();
  for (const a of apps) {
    if (furthestStage(a) < 0) continue;
    const key = a.source || 'Other';
    const row = map.get(key) ?? { source: key, applied: 0, responded: 0, rate: 0 };
    row.applied++;
    if (gotResponse(a)) row.responded++;
    map.set(key, row);
  }
  return [...map.values()]
    .map((r) => ({ ...r, rate: r.applied ? r.responded / r.applied : 0 }))
    .sort((a, b) => b.rate - a.rate || b.applied - a.applied);
}

export interface StageTime {
  status: Status;
  /** Mean days spent in the stage before moving on. */
  avgDays: number;
  /** Number of completed stays the mean is based on. */
  samples: number;
}

/** Average time spent in each stage, from consecutive status changes (completed stays only). */
export function timeInStage(apps: Application[]): StageTime[] {
  const stages: Status[] = ['wishlist', 'applied', 'screening', 'interview', 'offer'];
  const totals = new Map<Status, { days: number; n: number }>();
  for (const a of apps) {
    const h = [...a.history].sort((x, y) => x.date.localeCompare(y.date));
    for (let i = 0; i < h.length - 1; i++) {
      const days = (new Date(h[i + 1].date).getTime() - new Date(h[i].date).getTime()) / DAY;
      const t = totals.get(h[i].status) ?? { days: 0, n: 0 };
      totals.set(h[i].status, { days: t.days + Math.max(0, days), n: t.n + 1 });
    }
  }
  return stages.map((status) => {
    const t = totals.get(status);
    return { status, avgDays: t ? Math.round((t.days / t.n) * 10) / 10 : 0, samples: t?.n ?? 0 };
  });
}

/** Monday 00:00 local of the week containing `d`. */
export function weekStart(d: Date | string | number): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export interface WeekCount {
  /** YYYY-MM-DD of the Monday. */
  week: string;
  count: number;
}

/** Applications sent per week for the last `weeks` weeks, oldest first, including this week. */
export function weeklyApplications(apps: Application[], weeks = 8, now = new Date()): WeekCount[] {
  const current = weekStart(now);
  const out: WeekCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(current);
    start.setDate(start.getDate() - i * 7);
    out.push({ week: ymd(start), count: 0 });
  }
  for (const a of apps) {
    const applied = enteredAt(a, 'applied');
    if (!applied) continue;
    const row = out.find((w) => w.week === ymd(weekStart(applied)));
    if (row) row.count++;
  }
  return out;
}

export interface GhostCandidate {
  app: Application;
  quietDays: number;
}

/**
 * Open applications with no activity for `days` days and nothing scheduled.
 * Offers are left out: silence after an offer is on you, not them.
 */
export function ghostedCandidates(apps: Application[], days: number, now = Date.now()): GhostCandidate[] {
  return apps
    .filter((a) => OPEN_STATUSES.includes(a.status) && a.status !== 'offer')
    .filter((a) => !a.interviews.some((i) => new Date(i.date).getTime() > now))
    .map((app) => ({ app, quietDays: daysBetween(lastActivity(app, now), now) }))
    .filter((c) => c.quietDays >= days)
    .sort((a, b) => b.quietDays - a.quietDays);
}

export interface Kpis {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  responseRate: number;
}

export function kpis(apps: Application[], now = Date.now()): Kpis {
  const applied = apps.filter((a) => furthestStage(a) >= 0);
  return {
    total: apps.length,
    active: apps.filter((a) => OPEN_STATUSES.includes(a.status)).length,
    interviews: apps.flatMap((a) => a.interviews).filter((i) => new Date(i.date).getTime() > now).length,
    offers: apps.filter((a) => a.status === 'offer').length,
    responseRate: applied.length ? applied.filter(gotResponse).length / applied.length : 0,
  };
}
