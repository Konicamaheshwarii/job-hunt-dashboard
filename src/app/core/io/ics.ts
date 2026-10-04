import { Application } from '../models';

/** 2026-10-05T14:00:00.000Z -> 20261005T140000Z */
export function icsDate(iso: string | number | Date): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escapes text values per RFC 5545 (backslash, semicolon, comma, newline). */
export function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 75 octets, continuing with a leading space. */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** An iCalendar file with one event per interview. Pass `onlyUpcoming` to skip past ones. */
export function interviewsToIcs(apps: Application[], opts: { now?: number; onlyUpcoming?: boolean } = {}): string {
  const now = opts.now ?? Date.now();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HireTrack//Interviews//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const app of apps) {
    for (const iv of app.interviews) {
      const start = new Date(iv.date).getTime();
      if (opts.onlyUpcoming && start < now) continue;
      const end = start + (iv.durationMin || 60) * 60_000;
      const description = [`${app.role} at ${app.company}`, app.link, iv.notes, ...app.contacts.map((c) => `Contact: ${c.name}${c.role ? ` (${c.role})` : ''}`)]
        .filter(Boolean).join('\n');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${iv.id}@hiretrack`,
        `DTSTAMP:${icsDate(now)}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${icsText(`${iv.kind} interview: ${app.company}`)}`,
        `DESCRIPTION:${icsText(description)}`,
        ...(app.workMode === 'remote' ? ['LOCATION:Remote'] : app.location ? [`LOCATION:${icsText(app.location)}`] : []),
        ...(app.link ? [`URL:${app.link}`] : []),
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(`${iv.kind} interview with ${app.company}`)}`, 'TRIGGER:-PT1H', 'END:VALARM',
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
