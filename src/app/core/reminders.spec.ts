import { ymd } from './models';
import { reminders } from './reminders';
import { NOW, daysAgo, makeApp } from './testing';

const RULES = { followUpDays: 7, ghostDays: 21 };

describe('reminders', () => {
  it('suggests a follow-up 7 days after applying with no response', () => {
    const due = reminders([makeApp([['applied', 9]])], RULES, NOW);
    expect(due.length).toBe(1);
    expect(due[0].kind).toBe('follow-up');
    expect(due[0].due).toBe(ymd(daysAgo(2)));
    expect(due[0].overdue).toBeTrue();
  });

  it('does not nag before the threshold or after the ghosted threshold', () => {
    expect(reminders([makeApp([['applied', 6]])], RULES, NOW)).toEqual([]);
    expect(reminders([makeApp([['applied', 30]])], RULES, NOW)).toEqual([]);
  });

  it('restarts the clock after a logged follow-up and then suggests a second one', () => {
    expect(reminders([makeApp([['applied', 12]], { lastContacted: daysAgo(3) })], RULES, NOW)).toEqual([]);
    const second = reminders([makeApp([['applied', 18]], { lastContacted: daysAgo(8) })], RULES, NOW);
    expect(second[0].title).toBe('Send a second follow-up');
  });

  it('asks for an update when screening goes quiet', () => {
    const r = reminders([makeApp([['applied', 15], ['screening', 10]])], RULES, NOW);
    expect(r.map((x) => x.kind)).toEqual(['update']);
  });

  it('reminds to send a thank-you after an interview and to prepare before one', () => {
    const app = makeApp([['applied', 15], ['interview', 5]], {
      interviews: [
        { id: 'a', date: daysAgo(1), kind: 'Technical', durationMin: 60 },
        { id: 'b', date: daysAgo(-1), kind: 'Onsite', durationMin: 60 },
      ],
    });
    const kinds = reminders([app], RULES, NOW).map((r) => r.kind).sort();
    expect(kinds).toEqual(['prepare', 'thank-you']);
  });

  it('surfaces due next actions, stale offers and old wishlist items', () => {
    const r = reminders([
      makeApp([['applied', 2]], { nextAction: 'Email recruiter', nextActionDate: ymd(NOW) }),
      makeApp([['applied', 2]], { nextAction: 'Later', nextActionDate: ymd(daysAgo(-3)) }),
      makeApp([['applied', 20], ['offer', 4]]),
      makeApp([['wishlist', 15]]),
    ], RULES, NOW);
    expect(r.map((x) => x.kind).sort()).toEqual(['next-action', 'offer', 'wishlist']);
    expect(r.find((x) => x.kind === 'next-action')!.title).toBe('Email recruiter');
  });
});
