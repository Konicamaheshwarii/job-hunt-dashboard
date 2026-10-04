import { funnel, ghostedCandidates, responseRateBySource, timeInStage, weeklyApplications } from './analytics';
import { NOW, daysAgo, makeApp } from './testing';

describe('funnel', () => {
  const apps = [
    makeApp([['wishlist', 30]]),
    makeApp([['applied', 30]]),
    makeApp([['applied', 30], ['rejected', 20]]),
    makeApp([['applied', 30], ['screening', 25]]),
    makeApp([['applied', 30], ['screening', 25], ['interview', 20], ['rejected', 10]]),
    makeApp([['applied', 30], ['screening', 25], ['interview', 20], ['offer', 5]]),
  ];

  it('counts every application that reached each stage', () => {
    expect(funnel(apps).map((s) => s.count)).toEqual([5, 3, 2, 1]);
  });

  it('computes step and overall conversion', () => {
    const f = funnel(apps);
    expect(f[1].conversion).toBeCloseTo(0.6);
    expect(f[2].conversion).toBeCloseTo(2 / 3);
    expect(f[3].conversion).toBeCloseTo(0.5);
    expect(f[3].overall).toBeCloseTo(0.2);
  });

  it('treats an application added straight into screening as applied too', () => {
    expect(funnel([makeApp([['screening', 3]])]).map((s) => s.count)).toEqual([1, 1, 0, 0]);
  });

  it('handles an empty list without dividing by zero', () => {
    expect(funnel([]).every((s) => s.conversion === 0 && s.overall === 0)).toBeTrue();
  });
});

describe('responseRateBySource', () => {
  it('counts rejections as responses but not silence', () => {
    const rows = responseRateBySource([
      makeApp([['applied', 20], ['rejected', 10]], { source: 'Indeed' }),
      makeApp([['applied', 20]], { source: 'Indeed' }),
      makeApp([['applied', 20], ['ghosted', 1]], { source: 'Indeed' }),
      makeApp([['applied', 20], ['screening', 15]], { source: 'Referral' }),
      makeApp([['wishlist', 2]], { source: 'Referral' }),
    ]);
    expect(rows).toEqual([
      { source: 'Referral', applied: 1, responded: 1, rate: 1 },
      { source: 'Indeed', applied: 3, responded: 1, rate: 1 / 3 },
    ]);
  });
});

describe('timeInStage', () => {
  it('averages completed stays per stage', () => {
    const t = timeInStage([
      makeApp([['applied', 30], ['screening', 20], ['interview', 14]]),
      makeApp([['applied', 10], ['screening', 6]]),
    ]);
    const get = (s: string) => t.find((x) => x.status === s)!;
    expect(get('applied')).toEqual({ status: 'applied', avgDays: 7, samples: 2 });
    expect(get('screening')).toEqual({ status: 'screening', avgDays: 6, samples: 1 });
    expect(get('interview').samples).toBe(0);
  });
});

describe('weeklyApplications', () => {
  it('buckets applied dates into Monday-start weeks', () => {
    // NOW is Wednesday 2026-09-30; the current week starts Monday 2026-09-28.
    const weeks = weeklyApplications([
      makeApp([['applied', 1]]),
      makeApp([['applied', 2]]),
      makeApp([['applied', 3]]), // Sunday 27th: previous week
      makeApp([['applied', 60]]), // outside the window
      makeApp([['wishlist', 1]]),
    ], 3, new Date(NOW));
    expect(weeks).toEqual([
      { week: '2026-09-14', count: 0 },
      { week: '2026-09-21', count: 1 },
      { week: '2026-09-28', count: 2 },
    ]);
  });
});

describe('ghostedCandidates', () => {
  it('flags open applications that went quiet, longest first', () => {
    const quiet = makeApp([['applied', 40]], { company: 'Quiet' });
    const quieter = makeApp([['applied', 60], ['screening', 50]], { company: 'Quieter' });
    const recent = makeApp([['applied', 5]]);
    const rejected = makeApp([['applied', 60], ['rejected', 50]]);
    const offer = makeApp([['applied', 60], ['offer', 40]]);
    const result = ghostedCandidates([quiet, quieter, recent, rejected, offer], 21, NOW);
    expect(result.map((g) => [g.app.company, g.quietDays])).toEqual([['Quieter', 50], ['Quiet', 40]]);
  });

  it('is reset by a follow-up or an upcoming interview', () => {
    const followedUp = makeApp([['applied', 40]], { lastContacted: daysAgo(3) });
    const scheduled = makeApp([['applied', 40], ['interview', 30]], {
      interviews: [{ id: 'i', date: daysAgo(-2), kind: 'Technical', durationMin: 60 }],
    });
    expect(ghostedCandidates([followedUp, scheduled], 21, NOW)).toEqual([]);
  });
});
