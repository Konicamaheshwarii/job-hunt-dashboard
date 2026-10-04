import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApplicationsStore } from '../../core/applications.store';
import { Application, SOURCES, STATUSES, Status, newId, statusLabel, ymd } from '../../core/models';
import { ProfileStore } from '../../core/profile.store';
import { reminders } from '../../core/reminders';
import { SettingsStore } from '../../core/settings.store';
import { AgoPipe } from '../../shared/format';

function blank(): Application {
  const now = new Date().toISOString();
  return {
    id: '', company: '', role: '', link: '', location: '', workMode: 'remote', currency: 'USD', source: 'LinkedIn',
    status: 'applied', history: [{ status: 'applied', date: now }], contacts: [], notes: '', nextAction: '',
    interviews: [], createdAt: now, updatedAt: now,
  };
}

/** <input type="datetime-local"> value in local time. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${ymd(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

@Component({
  selector: 'app-application',
  imports: [FormsModule, RouterLink, AgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './application.page.html',
  styleUrl: './application.page.scss',
})
export class ApplicationPage {
  private readonly store = inject(ApplicationsStore);
  private readonly profile = inject(ProfileStore);
  private readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly statuses = STATUSES;
  protected readonly sources = SOURCES;
  protected readonly statusLabel = statusLabel;
  protected readonly toLocalInput = toLocalInput;

  protected readonly isNew = computed(() => this.id() === 'new');
  protected readonly missing = signal(false);
  protected readonly saved = signal('');
  protected readonly draft = signal<Application>(blank());

  protected readonly suggestions = computed(() => {
    const app = this.store.get(this.id());
    return app ? reminders([app], this.settings.settings()) : [];
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id === 'new') { this.draft.set(blank()); this.missing.set(false); return; }
      const app = this.store.byId().get(id);
      // Only load once per id so typing is not overwritten by our own saves.
      if (app && untracked(this.draft).id !== id) this.draft.set(structuredClone(app));
      this.missing.set(!app);
    });
  }

  protected onStatus(status: Status): void {
    const last = this.draft().history.at(-1);
    if (last?.status !== status) this.draft().history = [...this.draft().history, { status, date: new Date().toISOString() }];
    this.draft().status = status;
  }

  protected setHistoryDate(i: number, value: string): void {
    if (!value) return;
    const old = new Date(this.draft().history[i].date);
    const [y, m, d] = value.split('-').map(Number);
    old.setFullYear(y, m - 1, d);
    this.draft().history = this.draft().history.map((h, j) => (j === i ? { ...h, date: old.toISOString() } : h));
  }

  protected removeHistory(i: number): void {
    if (this.draft().history.length <= 1) return;
    this.draft().history = this.draft().history.filter((_, j) => j !== i);
    this.draft().status = this.draft().history.at(-1)!.status;
  }

  protected addContact(): void {
    this.draft().contacts = [...this.draft().contacts, { name: '', role: '', email: '' }];
  }

  protected removeContact(i: number): void {
    this.draft().contacts = this.draft().contacts.filter((_, j) => j !== i);
  }

  protected addInterview(): void {
    const d = new Date(Date.now() + 2 * 86_400_000);
    d.setHours(10, 0, 0, 0);
    this.draft().interviews = [...this.draft().interviews, { id: newId(), date: d.toISOString(), kind: 'Technical', durationMin: 60 }];
  }

  protected setInterviewDate(i: number, value: string): void {
    if (value) this.draft().interviews[i].date = new Date(value).toISOString();
  }

  protected removeInterview(i: number): void {
    this.draft().interviews = this.draft().interviews.filter((_, j) => j !== i);
  }

  protected logFollowUp(): void {
    this.draft().lastContacted = new Date().toISOString();
    this.save();
  }

  protected save(): void {
    const d = this.draft();
    if (!d.company.trim() || !d.role.trim()) return;
    const clean: Application = {
      ...d,
      company: d.company.trim(),
      role: d.role.trim(),
      contacts: d.contacts.filter((c) => c.name.trim()),
      salaryMin: d.salaryMin || undefined,
      salaryMax: d.salaryMax || undefined,
      nextActionDate: d.nextActionDate || undefined,
    };
    if (this.isNew()) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = clean;
      const created = this.store.add(rest);
      void this.router.navigate(['/app', created.id]);
    } else {
      this.store.save(clean);
      this.draft.set(structuredClone(this.store.get(clean.id)!));
    }
    this.saved.set(`Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  }

  protected remove(): void {
    if (!confirm(`Delete ${this.draft().company} (${this.draft().role})?`)) return;
    this.store.remove(this.draft().id);
    void this.router.navigate(['/board']);
  }

  protected matchThis(): void {
    this.profile.setJob({ appId: this.draft().id, company: this.draft().company, role: this.draft().role, jobDescription: this.draft().jobDescription ?? '' });
    void this.router.navigate(['/match']);
  }
}
