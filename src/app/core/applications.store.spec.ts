import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApplicationsStore, withStatus } from './applications.store';
import { makeApp } from './testing';

describe('ApplicationsStore', () => {
  let store: ApplicationsStore;

  beforeEach(() => {
    localStorage.removeItem('hiretrack.applications');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    store = TestBed.inject(ApplicationsStore);
  });

  it('starts with seeded demo data and records each status change with its date', () => {
    expect(store.all().length).toBeGreaterThan(25);
    const app = store.all().find((a) => a.status === 'applied')!;
    store.move(app.id, 'screening', '2026-10-01T10:00:00.000Z');
    const moved = store.get(app.id)!;
    expect(moved.status).toBe('screening');
    expect(moved.history.at(-1)).toEqual({ status: 'screening', date: '2026-10-01T10:00:00.000Z' });
  });

  it('skips duplicates on import', () => {
    store.clear();
    const a = makeApp([['applied', 2]], { company: 'Globex', link: 'x' });
    expect(store.importMany([a])).toBe(1);
    expect(store.importMany([{ ...a, id: 'other' }])).toBe(0);
    expect(store.all().length).toBe(1);
  });
});

describe('withStatus', () => {
  it('is a no-op when the status does not change', () => {
    const a = makeApp([['applied', 2]]);
    expect(withStatus(a, 'applied')).toBe(a);
    expect(withStatus(a, 'rejected').history.length).toBe(2);
  });
});
