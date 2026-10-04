import { DEMO_RESUME } from '../seed';
import { parseResume, parseRoleLine } from './parse';
import { joinTextItems } from './pdf';

describe('parseResume', () => {
  it('turns a plain-text resume into a structured profile', () => {
    const p = parseResume(DEMO_RESUME);
    expect(p.name).toBe('Jordan Avery');
    expect(p.headline).toBe('Senior Frontend Engineer');
    expect(p.email).toBe('jordan.avery@example.com');
    expect(p.location).toBe('Austin, TX');
    expect(p.summary).toContain('8 years');
    expect(p.experience.map((e) => e.company)).toEqual(['Brightwave Analytics', 'Northgate Logistics', 'Pixel & Pine Studio']);
    expect(p.experience[0].period).toBe('2021 - Present');
    expect(p.experience[0].bullets.length).toBe(5);
    expect(p.education[0]).toContain('Computer Science');
    for (const s of ['Angular', 'TypeScript', 'RxJS', 'Unit testing', 'E2E testing', 'Accessibility', 'AWS']) expect(p.skills).toContain(s);
  });

  it('reads the common role-line formats', () => {
    expect(parseRoleLine('Frontend Developer at Globex (Jan 2019 - Mar 2021)')).toEqual({ title: 'Frontend Developer', company: 'Globex', period: 'Jan 2019 - Mar 2021' });
    expect(parseRoleLine('Senior Engineer — Initech, 2021 – Present')).toEqual({ title: 'Senior Engineer', company: 'Initech', period: '2021 – Present' });
  });
});

describe('joinTextItems', () => {
  it('keeps PDF line breaks and re-joins hyphenated words', () => {
    expect(joinTextItems([{ str: 'Built a develop-', hasEOL: true }, { str: 'ment tool' }, { str: 'in Angular', hasEOL: true }]))
      .toBe('Built a development tool in Angular\n');
  });
});
