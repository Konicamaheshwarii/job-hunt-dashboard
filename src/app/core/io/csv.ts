import { Application, Contact, Interview, STATUSES, Status, StatusChange, WorkMode, newId } from '../models';

/** RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

const cell = (v: unknown): string => {
  const s = v === undefined || v === null ? '' : String(v);
  // Quote when needed; prefix formula-looking text so spreadsheets do not execute it.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_COLUMNS = [
  'Company', 'Role', 'Status', 'Link', 'Location', 'Work mode', 'Salary min', 'Salary max', 'Currency', 'Source',
  'Applied', 'History', 'Contacts', 'Interviews', 'Next action', 'Next action date', 'Last contacted', 'Match score', 'Notes',
] as const;

/** "applied 2026-08-01T09:00:00.000Z; screening 2026-08-05T..." */
const historyCell = (h: StatusChange[]) => h.map((x) => `${x.status} ${x.date}`).join('; ');

export function toCsv(apps: Application[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const a of apps) {
    lines.push([
      a.company, a.role, a.status, a.link, a.location, a.workMode, a.salaryMin, a.salaryMax, a.currency, a.source,
      a.history.find((h) => h.status === 'applied')?.date.slice(0, 10) ?? '',
      historyCell(a.history),
      a.contacts.length ? JSON.stringify(a.contacts) : '',
      a.interviews.length ? JSON.stringify(a.interviews.map(({ date, kind, durationMin, notes }) => ({ date, kind, durationMin, notes }))) : '',
      a.nextAction, a.nextActionDate, a.lastContacted, a.matchScore, a.notes,
    ].map(cell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

// Headers other trackers (and hand-made spreadsheets) commonly use.
const ALIASES: Record<string, (typeof CSV_COLUMNS)[number]> = {
  'company name': 'Company', employer: 'Company', organization: 'Company',
  position: 'Role', title: 'Role', 'job title': 'Role',
  url: 'Link', 'job link': 'Link', 'posting url': 'Link',
  'date applied': 'Applied', 'applied on': 'Applied', 'applied date': 'Applied',
  stage: 'Status', remote: 'Work mode', notes: 'Notes', comments: 'Notes', 'source / channel': 'Source', channel: 'Source',
};

const STATUS_WORDS: Record<string, Status> = {
  saved: 'wishlist', bookmarked: 'wishlist', wishlist: 'wishlist', 'to apply': 'wishlist',
  applied: 'applied', submitted: 'applied',
  screen: 'screening', screening: 'screening', 'phone screen': 'screening',
  interview: 'interview', interviewing: 'interview', onsite: 'interview',
  offer: 'offer', offered: 'offer',
  rejected: 'rejected', declined: 'rejected', 'not selected': 'rejected',
  ghosted: 'ghosted', 'no response': 'ghosted',
};

export function toStatus(raw: string): Status | undefined {
  const s = raw.trim().toLowerCase();
  return STATUSES.some((x) => x.id === s) ? (s as Status) : STATUS_WORDS[s];
}

function parseHistory(raw: string): StatusChange[] {
  return raw.split(';').map((p) => p.trim()).filter(Boolean).flatMap((p) => {
    const [st, date] = p.split(/\s+/);
    const status = toStatus(st ?? '');
    return status && date && !isNaN(Date.parse(date)) ? [{ status, date: new Date(date).toISOString() }] : [];
  });
}

function parseJsonList<T>(raw: string): T[] {
  if (!raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const num = (v: string) => {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return v.trim() && Number.isFinite(n) ? n : undefined;
};
const unformula = (v: string) => v.replace(/^'(?=[=+\-@])/, '');

export interface CsvImport {
  apps: Application[];
  errors: string[];
}

/** Reads this app's CSV export, or any spreadsheet with at least Company and Role columns. */
export function fromCsv(text: string, now = new Date()): CsvImport {
  const rows = parseCsv(text);
  if (!rows.length) return { apps: [], errors: ['The file is empty.'] };
  const header: string[] = rows[0].map((h): string => {
    const k = h.trim().toLowerCase();
    return CSV_COLUMNS.find((c) => c.toLowerCase() === k) ?? ALIASES[k] ?? h.trim();
  });
  const col = (r: string[], name: string) => unformula(r[header.indexOf(name)] ?? '').trim();
  if (!header.includes('Company') || !header.includes('Role')) {
    return { apps: [], errors: ['The CSV needs at least "Company" and "Role" columns.'] };
  }

  const apps: Application[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const company = col(r, 'Company');
    const role = col(r, 'Role');
    if (!company || !role) { errors.push(`Row ${i + 2}: missing company or role, skipped.`); return; }
    const status = toStatus(col(r, 'Status')) ?? 'applied';
    let history = parseHistory(col(r, 'History'));
    if (!history.length) {
      const appliedRaw = col(r, 'Applied');
      const applied = appliedRaw && !isNaN(Date.parse(appliedRaw)) ? new Date(appliedRaw).toISOString() : now.toISOString();
      history = status === 'wishlist' || status === 'applied'
        ? [{ status, date: applied }]
        : [{ status: 'applied', date: applied }, { status, date: applied }];
    }
    if (history[history.length - 1].status !== status) history.push({ status, date: now.toISOString() });
    const mode = col(r, 'Work mode').toLowerCase();
    const interviews = parseJsonList<Partial<Interview>>(col(r, 'Interviews'))
      .filter((iv) => iv.date && !isNaN(Date.parse(iv.date)))
      .map((iv): Interview => ({ id: newId(), date: iv.date!, kind: iv.kind || 'Interview', durationMin: Number(iv.durationMin) || 60, notes: iv.notes }));
    const contacts = parseJsonList<Contact>(col(r, 'Contacts')).filter((c) => c && typeof c.name === 'string');
    apps.push({
      id: newId(),
      company, role, status, history, contacts, interviews,
      link: col(r, 'Link'),
      location: col(r, 'Location'),
      workMode: (['onsite', 'hybrid', 'remote'].includes(mode) ? mode : mode === 'yes' || mode === 'true' ? 'remote' : 'onsite') as WorkMode,
      salaryMin: num(col(r, 'Salary min')),
      salaryMax: num(col(r, 'Salary max')),
      currency: col(r, 'Currency') || 'USD',
      source: col(r, 'Source') || 'Other',
      nextAction: col(r, 'Next action'),
      nextActionDate: col(r, 'Next action date') || undefined,
      lastContacted: col(r, 'Last contacted') || undefined,
      matchScore: num(col(r, 'Match score')),
      notes: col(r, 'Notes'),
      createdAt: history[0].date,
      updatedAt: history[history.length - 1].date,
    });
  });
  return { apps, errors };
}
