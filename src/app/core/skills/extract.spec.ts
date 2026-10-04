import { canonicalSkill, extractSkills } from './extract';

describe('extractSkills', () => {
  it('maps synonyms to one canonical skill', () => {
    expect(extractSkills('We use ReactJS, k8s, Postgres and GitHub Actions.')).toEqual(['React', 'Kubernetes', 'PostgreSQL', 'CI/CD']);
    expect(extractSkills('Strong TS and RxJS observables')).toEqual(['TypeScript', 'RxJS']);
  });

  it('prefers the longest phrase, so React Native is not also React', () => {
    expect(extractSkills('Mobile apps in React Native')).toEqual(['React Native']);
    expect(extractSkills('Angular Material and Angular')).toEqual(['Angular Material', 'Angular']);
  });

  it('respects word boundaries and punctuation', () => {
    expect(extractSkills('JavaScript expert')).toEqual(['JavaScript']);
    expect(extractSkills('Backend in Node.js.')).toEqual(['Node.js']);
    expect(extractSkills('C# and C++ and .NET')).toEqual(['C#', 'C++', '.NET']);
  });

  it('matches ambiguous words only in their technical spelling', () => {
    expect(extractSkills('Rest of the team will go home; we need solid swift people')).toEqual([]);
    expect(extractSkills('Design REST endpoints in Go, Swift for iOS, SOLID principles')).toEqual(['REST APIs', 'Go', 'Swift', 'Clean code']);
  });

  it('finds nothing in plain prose', () => {
    expect(extractSkills('We are a friendly team that loves coffee and good documentation.')).toEqual([]);
  });
});

describe('canonicalSkill', () => {
  it('normalises typed skills and keeps unknown ones as written', () => {
    expect(canonicalSkill('reactjs')).toBe('React');
    expect(canonicalSkill(' typescript ')).toBe('TypeScript');
    expect(canonicalSkill('Underwater basket weaving')).toBe('Underwater basket weaving');
  });
});
