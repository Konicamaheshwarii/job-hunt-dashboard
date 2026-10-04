import { parseResume } from '../resume/parse';
import { DEMO_JD, DEMO_RESUME } from '../seed';
import { matchSkills } from '../skills/match';
import { validateSuggestions } from '../skills/validate';
import { DemoProvider, demoCoverLetter, demoGapAnalysis, rephraseBullet } from './demo.provider';

const profile = parseResume(DEMO_RESUME);
const match = matchSkills(profile.skills, DEMO_JD);

describe('rephraseBullet', () => {
  it('moves trailing tools to the front and upgrades weak openers without adding words', () => {
    expect(rephraseBullet('Developed a tracking app with Angular, RxJS and WebSockets for 2,000 daily users.'))
      .toBe('Using Angular, RxJS and WebSockets, developed a tracking app for 2,000 daily users.');
    expect(rephraseBullet('Worked on REST API integration.')).toBe('Delivered REST API integration.');
    expect(rephraseBullet('Built a design system with Storybook used by 4 teams.')).toBe('');
  });
});

describe('demo gap analysis', () => {
  it('produces suggestions that all pass the no-invention validator', () => {
    const a = demoGapAnalysis({ profile, jobDescription: DEMO_JD, match });
    expect(a.gaps.map((g) => g.skill)).toContain('GraphQL');
    expect(a.suggestions.length).toBeGreaterThan(0);
    const { rejected } = validateSuggestions(a.suggestions, profile.rawText, profile.skills);
    expect(rejected).toEqual([]);
  });
});

describe('demo cover letter', () => {
  it('uses the company, matched skills and resume facts, and never claims a missing skill', () => {
    const letter = demoCoverLetter({ profile, jobDescription: DEMO_JD, company: 'Lumenfield Health', role: 'Senior Angular Engineer', tone: 'formal', match });
    expect(letter).toContain('Dear Lumenfield Health hiring team,');
    expect(letter).toContain('Angular');
    expect(letter).toContain('Jordan Avery');
    expect(letter).toContain('I have not used GraphQL in production yet');
    expect(letter).not.toMatch(/\[[A-Z][a-z]+\]/);
  });

  it('streams the letter in pieces', async () => {
    const pieces: string[] = [];
    const input = { profile, jobDescription: DEMO_JD, company: 'Acme', role: 'Engineer', tone: 'concise' as const, match };
    for await (const p of new DemoProvider(0).stream({ task: 'cover-letter', system: '', prompt: '', input })) pieces.push(p);
    expect(pieces.length).toBeGreaterThan(20);
    expect(pieces.join('')).toBe(demoCoverLetter(input));
  });
});
