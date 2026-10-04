import { makeApp } from '../testing';
import { foldLine, icsText, interviewsToIcs } from './ics';

describe('interviewsToIcs', () => {
  const app = makeApp([['applied', 10], ['interview', 2]], {
    id: 'app1',
    company: 'Acme, Inc; Labs',
    location: 'Austin, TX',
    workMode: 'onsite',
    interviews: [
      { id: 'iv1', date: '2026-10-05T14:00:00.000Z', kind: 'Technical', durationMin: 90, notes: 'Bring\nportfolio' },
      { id: 'iv0', date: '2026-09-01T14:00:00.000Z', kind: 'Screen', durationMin: 30 },
    ],
  });

  it('writes a valid VEVENT with UTC times, end from duration and escaped text', () => {
    const ics = interviewsToIcs([app], { now: Date.parse('2026-09-30T12:00:00Z'), onlyUpcoming: true });
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('DTSTART:20261005T140000Z');
    expect(lines).toContain('DTEND:20261005T153000Z');
    expect(lines).toContain('UID:iv1@hiretrack');
    expect(lines).toContain('SUMMARY:Technical interview: Acme\\, Inc\\; Labs');
    expect(lines).toContain('LOCATION:Austin\\, TX');
    expect(ics).toContain('Bring\\nportfolio');
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(1);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBeTrue();
  });

  it('includes past interviews unless asked for upcoming only', () => {
    expect(interviewsToIcs([app]).match(/BEGIN:VEVENT/g)!.length).toBe(2);
  });
});

describe('ics helpers', () => {
  it('escapes and folds long lines at 75 octets', () => {
    expect(icsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const folded = foldLine('DESCRIPTION:' + 'x'.repeat(150));
    const parts = folded.split('\r\n');
    expect(parts.length).toBe(3);
    expect(parts.every((p) => p.length <= 75)).toBeTrue();
    expect(parts[1].startsWith(' ')).toBeTrue();
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe('DESCRIPTION:' + 'x'.repeat(150));
  });
});
