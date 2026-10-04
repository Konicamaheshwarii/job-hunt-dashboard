import { seedApplications } from '../seed';
import { makeApp } from '../testing';
import { fromCsv, parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and newlines inside fields, CRLF and BOM', () => {
    const rows = parseCsv('﻿a,b,c\r\n"x, y","say ""hi""","line1\nline2"\r\n\r\n');
    expect(rows).toEqual([['a', 'b', 'c'], ['x, y', 'say "hi"', 'line1\nline2']]);
  });
});

describe('CSV round trip', () => {
  it('exports and re-imports every field', () => {
    const original = seedApplications(new Date('2026-09-30T12:00:00Z'));
    const { apps, errors } = fromCsv(toCsv(original));
    expect(errors).toEqual([]);
    expect(apps.length).toBe(original.length);
    const strip = (a: any) => JSON.parse(JSON.stringify({ ...a, id: '', jobDescription: undefined, interviews: a.interviews.map((i: any) => ({ ...i, id: '' })) }));
    apps.forEach((a, i) => expect(strip(a)).toEqual(strip(original[i])));
  });

  it('keeps tricky text intact and neutralises spreadsheet formulas', () => {
    const app = makeApp([['applied', 3]], { company: 'Quote "Co", Ltd', notes: '=HYPERLINK("x")\nsecond line' });
    const csv = toCsv([app]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")`);
    const back = fromCsv(csv).apps[0];
    expect(back.company).toBe('Quote "Co", Ltd');
    expect(back.notes).toBe('=HYPERLINK("x")\nsecond line');
  });

  it('imports spreadsheets from other trackers using common header names', () => {
    const { apps, errors } = fromCsv('Company Name,Position,Stage,Date Applied\nGlobex,UI Engineer,Phone screen,2026-09-01\n,Missing company,applied,\n');
    expect(apps.length).toBe(1);
    expect(apps[0].role).toBe('UI Engineer');
    expect(apps[0].status).toBe('screening');
    expect(apps[0].history.map((h) => h.status)).toEqual(['applied', 'screening']);
    expect(errors[0]).toContain('Row 3');
  });

  it('refuses a file without Company and Role columns', () => {
    expect(fromCsv('foo,bar\n1,2').errors[0]).toContain('Company');
  });
});
