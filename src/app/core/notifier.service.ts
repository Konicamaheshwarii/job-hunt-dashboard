import { Injectable, computed, inject, signal } from '@angular/core';
import { ApplicationsStore } from './applications.store';
import { ymd } from './models';
import { reminders } from './reminders';
import { SettingsStore } from './settings.store';
import { readJson, writeJson } from './storage';

export type PermissionState = NotificationPermission | 'unsupported';

const LAST_KEY = 'hiretrack.notified';

/** Opt-in browser notifications for reminders that are due. At most one summary per day. */
@Injectable({ providedIn: 'root' })
export class NotifierService {
  private readonly settings = inject(SettingsStore);
  private readonly apps = inject(ApplicationsStore);

  private readonly perm = signal<PermissionState>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  readonly permission = this.perm.asReadonly();
  readonly enabled = computed(() => this.settings.settings().notifications && this.perm() === 'granted');

  async enable(): Promise<PermissionState> {
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    this.perm.set(result);
    this.settings.update({ notifications: result === 'granted' });
    if (result === 'granted') this.notifyDue(true);
    return result;
  }

  disable(): void {
    this.settings.update({ notifications: false });
  }

  /** Shows one notification summarising today's due reminders. */
  notifyDue(force = false): boolean {
    if (!this.enabled()) return false;
    const today = ymd(Date.now());
    if (!force && readJson<string>(LAST_KEY, '') === today) return false;
    const s = this.settings.settings();
    const due = reminders(this.apps.all(), s).filter((r) => r.due <= today);
    if (!due.length) return false;
    writeJson(LAST_KEY, today);
    try {
      new Notification(`HireTrack: ${due.length} follow-up${due.length === 1 ? '' : 's'} due`, {
        body: due.slice(0, 3).map((r) => `${r.title}: ${r.detail}`).join('\n'),
        tag: 'hiretrack-due',
      });
      return true;
    } catch {
      return false;
    }
  }
}
