import { jdSkills, matchSkills } from './match';

const JD = `Senior Frontend Engineer

Requirements
- Angular and TypeScript
- Unit testing

Nice to have
- Docker
- GraphQL
`;

describe('jdSkills', () => {
  it('weights skills by the section they appear in', () => {
    const byName = new Map(jdSkills(JD).map((s) => [s.name, s]));
    expect(byName.get('Angular')!.importance).toBe('required');
    expect(byName.get('Unit testing')!.weight).toBe(2);
    expect(byName.get('Docker')!.importance).toBe('preferred');
    expect(byName.get('GraphQL')!.weight).toBe(1);
  });

  it('lets an inline hint override the section', () => {
    const skills = jdSkills('What we use\n- Angular every day\n- Kubernetes is a plus');
    expect(skills.find((s) => s.name === 'Kubernetes')!.importance).toBe('preferred');
    expect(skills.find((s) => s.name === 'Angular')!.importance).toBe('mentioned');
  });
});

describe('matchSkills', () => {
  it('scores 100 when every skill is present and 0 when none is', () => {
    expect(matchSkills(['Angular', 'TypeScript', 'Jasmine', 'Docker', 'GraphQL'], JD).score).toBe(100);
    expect(matchSkills(['Cobol'], JD).score).toBe(0);
  });

  it('counts a missing required skill more than a missing nice-to-have', () => {
    // total weight = 2+2+2+1+1 = 8
    const missingRequired = matchSkills(['TypeScript', 'Unit testing', 'Docker', 'GraphQL'], JD);
    const missingPreferred = matchSkills(['Angular', 'TypeScript', 'Unit testing', 'GraphQL'], JD);
    expect(missingRequired.score).toBe(75);
    expect(missingPreferred.score).toBe(88);
    expect(missingRequired.missing.map((s) => s.name)).toEqual(['Angular']);
  });

  it('accepts resume skills by synonym and lists extras', () => {
    const r = matchSkills(['angularjs', 'Angular 19', 'ts', 'Figma'], 'Angular and TypeScript required');
    expect(r.matched.map((s) => s.name).sort()).toEqual(['Angular', 'TypeScript']);
    expect(r.extra).toContain('Figma');
  });

  it('returns 0 for a description with no known skills', () => {
    const r = matchSkills(['Angular'], 'We value kindness.');
    expect(r.score).toBe(0);
    expect(r.jdSkills).toEqual([]);
  });
});
