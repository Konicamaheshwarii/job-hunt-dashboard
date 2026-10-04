import { Application, Profile, STATUSES } from '../models';
import { Settings } from '../settings.store';

export interface Backup {
  app: 'hiretrack';
  version: 1;
  exportedAt: string;
  applications: Application[];
  profile?: Profile;
  /** Settings without API keys: a backup file should never carry secrets. */
  settings?: Partial<Omit<Settings, 'apiKeys'>>;
}

export function makeBackup(applications: Application[], profile: Profile, settings: Settings): Backup {
  const { apiKeys: _keys, ...safe } = settings;
  return { app: 'hiretrack', version: 1, exportedAt: new Date().toISOString(), applications, profile, settings: safe };
}

const isApp = (a: any): a is Application =>
  a && typeof a.id === 'string' && typeof a.company === 'string' && typeof a.role === 'string'
  && STATUSES.some((s) => s.id === a.status) && Array.isArray(a.history);

/** Parses and validates a backup file. Invalid applications are dropped, not trusted. */
export function parseBackup(text: string): { backup: Backup; skipped: number } {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (raw?.app !== 'hiretrack' || !Array.isArray(raw?.applications)) throw new Error('This is not a HireTrack backup file.');
  const applications: Application[] = raw.applications.filter(isApp).map((a: Application) => ({
    ...a,
    contacts: Array.isArray(a.contacts) ? a.contacts : [],
    interviews: Array.isArray(a.interviews) ? a.interviews : [],
    notes: a.notes ?? '',
    nextAction: a.nextAction ?? '',
  }));
  const profile = raw.profile && typeof raw.profile.rawText === 'string' ? (raw.profile as Profile) : undefined;
  const { apiKeys: _ignored, ...settings } = raw.settings ?? {};
  return {
    backup: { app: 'hiretrack', version: 1, exportedAt: String(raw.exportedAt ?? ''), applications, profile, settings },
    skipped: raw.applications.length - applications.length,
  };
}
