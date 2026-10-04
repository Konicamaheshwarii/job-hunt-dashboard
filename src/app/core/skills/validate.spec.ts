import { figures, validateSuggestions } from './validate';

const RESUME = `Experience
- Built a real-time tracking app with Angular and RxJS for 2,000 daily users.
- Worked on REST API integration with a Node.js backend.
- Raised unit test coverage from 35% to 80%.`;

describe('validateSuggestions', () => {
  it('accepts a rewrite that only rephrases the resume', () => {
    const { accepted, rejected } = validateSuggestions([
      { original: 'Worked on REST API integration with a Node.js backend.', suggestion: 'Delivered REST API integration with a Node.js backend.' },
    ], RESUME);
    expect(rejected).toEqual([]);
    expect(accepted.length).toBe(1);
  });

  it('rejects a rewrite that adds a skill the resume does not have', () => {
    const { accepted, rejected } = validateSuggestions([
      { original: 'Built a real-time tracking app with Angular and RxJS for 2,000 daily users.',
        suggestion: 'Built a real-time tracking app with Angular, RxJS and GraphQL on AWS for 2,000 daily users.' },
    ], RESUME);
    expect(accepted).toEqual([]);
    expect(rejected[0].why).toContain('GraphQL');
    expect(rejected[0].why).toContain('AWS');
  });

  it('rejects made-up numbers', () => {
    const { rejected } = validateSuggestions([
      { original: 'Raised unit test coverage from 35% to 80%.', suggestion: 'Raised unit test coverage from 35% to 95%, cutting bugs by 40%.' },
    ], RESUME);
    expect(rejected[0].why).toContain('95%');
  });

  it('rejects rewrites of lines that are not in the resume, and no-op rewrites', () => {
    const { accepted, rejected } = validateSuggestions([
      { original: 'Watered the office plants every week.', suggestion: 'Kept the office plants alive.' },
      { original: 'Raised unit test coverage from 35% to 80%.', suggestion: 'raised unit test coverage from 35% to 80%.' },
    ], RESUME);
    expect(accepted).toEqual([]);
    expect(rejected.map((r) => r.why)).toEqual(['Rewrites a line that is not in your resume.', 'Same as the original.']);
  });

  it('counts skills from the profile list as known', () => {
    const { accepted } = validateSuggestions([
      { original: 'Worked on REST API integration with a Node.js backend.', suggestion: 'Delivered REST API integration with a Node.js backend in TypeScript.' },
    ], RESUME, ['TypeScript']);
    expect(accepted.length).toBe(1);
  });
});

describe('figures', () => {
  it('normalises numbers so "2,000" and "2000" compare equal', () => {
    expect(figures('2,000 users, 40 % faster, $1.5M saved, 3x')).toEqual(['2000', '40%', '$1.5m', '3x']);
  });
});
