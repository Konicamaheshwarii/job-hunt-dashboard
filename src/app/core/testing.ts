import { Application, Status } from './models';

export const NOW = new Date('2026-09-30T12:00:00Z').getTime();
export const daysAgo = (n: number, from = NOW) => new Date(from - n * 86_400_000).toISOString();

/** Builds an application whose history steps are given as [status, days ago]. */
export function makeApp(steps: [Status, number][], patch: Partial<Application> = {}): Application {
  const history = steps.map(([status, d]) => ({ status, date: daysAgo(d) }));
  return {
    id: Math.random().toString(36).slice(2),
    company: 'Acme',
    role: 'Frontend Engineer',
    link: '',
    location: 'Remote',
    workMode: 'remote',
    currency: 'USD',
    source: 'LinkedIn',
    status: steps[steps.length - 1][0],
    history,
    contacts: [],
    notes: '',
    nextAction: '',
    interviews: [],
    createdAt: history[0].date,
    updatedAt: history[history.length - 1].date,
    ...patch,
  };
}
