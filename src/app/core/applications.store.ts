import { Injectable, computed, effect, signal } from '@angular/core';
import { Application, Status, newId } from './models';
import { seedApplications } from './seed';
import { readJson, writeJson } from './storage';

const KEY = 'hiretrack.applications';

export type NewApplication = Omit<Application, 'id' | 'history' | 'createdAt' | 'updatedAt'> & { history?: Application['history'] };

/** Keeps `status` and the last history entry in sync, and the history in date order. */
export function normalize(app: Application): Application {
  const history = [...app.history].sort((a, b) => a.date.localeCompare(b.date));
  if (!history.length || history[history.length - 1].status !== app.status) {
    history.push({ status: app.status, date: new Date().toISOString() });
  }
  return { ...app, history };
}

/** Moves an application to a new status, recording when it happened. */
export function withStatus(app: Application, status: Status, date = new Date().toISOString()): Application {
  if (app.status === status) return app;
  return { ...app, status, history: [...app.history, { status, date }], updatedAt: date };
}

@Injectable({ providedIn: 'root' })
export class ApplicationsStore {
  private readonly state = signal<Application[]>(readJson<Application[] | null>(KEY, null) ?? seedApplications());

  readonly all = this.state.asReadonly();
  readonly byId = computed(() => new Map(this.state().map((a) => [a.id, a])));
  readonly isDemoData = computed(() => this.state().some((a) => a.id.startsWith('seed-')));

  constructor() {
    effect(() => writeJson(KEY, this.state()));
  }

  get(id: string): Application | undefined {
    return this.byId().get(id);
  }

  add(input: NewApplication): Application {
    const now = new Date().toISOString();
    const app = normalize({ ...input, id: newId(), history: input.history ?? [{ status: input.status, date: now }], createdAt: now, updatedAt: now });
    this.state.update((list) => [app, ...list]);
    return app;
  }

  save(app: Application): void {
    const next = normalize({ ...app, updatedAt: new Date().toISOString() });
    this.state.update((list) => list.map((a) => (a.id === app.id ? next : a)));
  }

  move(id: string, status: Status, date?: string): void {
    this.state.update((list) => list.map((a) => (a.id === id ? withStatus(a, status, date) : a)));
  }

  logFollowUp(id: string, date = new Date().toISOString()): void {
    this.state.update((list) => list.map((a) => (a.id === id ? { ...a, lastContacted: date, updatedAt: date } : a)));
  }

  remove(id: string): void {
    this.state.update((list) => list.filter((a) => a.id !== id));
  }

  /** Adds imported applications, skipping ones that already exist (same company, role and link). */
  importMany(apps: Application[]): number {
    const key = (a: Application) => `${a.company}|${a.role}|${a.link}`.toLowerCase();
    const existing = new Set(this.state().map(key));
    const fresh = apps.filter((a) => !existing.has(key(a))).map(normalize);
    this.state.update((list) => [...fresh, ...list]);
    return fresh.length;
  }

  replaceAll(apps: Application[]): void {
    this.state.set(apps.map(normalize));
  }

  resetDemo(): void {
    this.state.set(seedApplications());
  }

  clear(): void {
    this.state.set([]);
  }
}
