import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApplicationsStore } from '../../core/applications.store';
import { makeBackup, parseBackup } from '../../core/io/backup';
import { fromCsv, toCsv } from '../../core/io/csv';
import { LlmService } from '../../core/llm/llm.service';
import { ymd } from '../../core/models';
import { ProfileStore } from '../../core/profile.store';
import { PROVIDERS, ProviderId, Settings, SettingsStore, Theme } from '../../core/settings.store';
import { downloadText, pickedFile } from '../../shared/download';

type RealProvider = Exclude<ProviderId, 'demo'>;
type NumberSetting = 'followUpDays' | 'ghostDays' | 'weeklyGoal';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  protected readonly store = inject(SettingsStore);
  private readonly apps = inject(ApplicationsStore);
  private readonly profile = inject(ProfileStore);
  private readonly llm = inject(LlmService);

  protected readonly providers = PROVIDERS;
  protected readonly themes: Theme[] = ['system', 'light', 'dark'];
  protected readonly current = computed(() => PROVIDERS.find((p) => p.id === this.store.provider())!);
  protected readonly real = computed(() => (this.store.isDemo() ? null : (this.store.provider() as RealProvider)));
  protected readonly count = computed(() => this.apps.all().length);

  protected readonly test = signal<{ state: 'idle' | 'running' | 'ok' | 'fail'; message?: string }>({ state: 'idle' });
  protected readonly dataMessage = signal<{ ok: boolean; text: string } | null>(null);

  protected choose(id: ProviderId): void {
    this.store.update({ provider: id });
    this.test.set({ state: 'idle' });
  }

  protected setKey(value: string): void {
    this.store.setKey(this.real()!, value.trim());
    this.test.set({ state: 'idle' });
  }

  protected setModel(value: string): void {
    if (value.trim()) this.store.setModel(this.real()!, value.trim());
  }

  protected setNumber(key: NumberSetting, value: string, min: number, max: number): void {
    const n = Math.round(Number(value));
    if (Number.isFinite(n)) this.store.update({ [key]: Math.min(max, Math.max(min, n)) } as Partial<Settings>);
  }

  protected async testConnection(): Promise<void> {
    this.test.set({ state: 'running' });
    try {
      const reply = await this.llm.complete({ task: 'ping', json: true, system: 'You are a health check.', prompt: 'Reply with JSON only: {"ok":true}' });
      this.test.set({ state: 'ok', message: reply ? 'Connected. The provider answered.' : 'Connected, but the reply was empty.' });
    } catch (e) {
      this.test.set({ state: 'fail', message: (e as Error).message });
    }
  }

  protected clearKey(): void {
    this.store.setKey(this.real()!, '');
  }

  // ---------- data ----------

  protected exportCsv(): void {
    downloadText(`hiretrack-${ymd(Date.now())}.csv`, toCsv(this.apps.all()), 'text/csv');
  }

  protected exportJson(): void {
    const backup = makeBackup(this.apps.all(), this.profile.profile(), this.store.settings());
    downloadText(`hiretrack-backup-${ymd(Date.now())}.json`, JSON.stringify(backup, null, 2), 'application/json');
  }

  protected async importCsv(event: Event): Promise<void> {
    const file = pickedFile(event);
    if (!file) return;
    const { apps, errors } = fromCsv(await file.text());
    const added = this.apps.importMany(apps);
    this.dataMessage.set({
      ok: added > 0 || !errors.length,
      text: `Imported ${added} application${added === 1 ? '' : 's'}${apps.length - added ? `, skipped ${apps.length - added} duplicates` : ''}.${errors.length ? ` ${errors.slice(0, 3).join(' ')}` : ''}`,
    });
  }

  protected async importJson(event: Event): Promise<void> {
    const file = pickedFile(event);
    if (!file) return;
    try {
      const { backup, skipped } = parseBackup(await file.text());
      if (!confirm(`Replace your ${this.count()} applications with the ${backup.applications.length} in this backup?`)) return;
      this.apps.replaceAll(backup.applications);
      if (backup.profile) this.profile.update(backup.profile);
      if (backup.settings) this.store.update(backup.settings);
      this.dataMessage.set({ ok: true, text: `Restored ${backup.applications.length} applications${skipped ? ` (${skipped} invalid entries skipped)` : ''}.` });
    } catch (e) {
      this.dataMessage.set({ ok: false, text: (e as Error).message });
    }
  }

  protected resetDemo(): void {
    if (!confirm('Replace all applications with the demo data?')) return;
    this.apps.resetDemo();
    this.profile.loadDemo();
    this.dataMessage.set({ ok: true, text: 'Demo data restored.' });
  }

  protected clearAll(): void {
    if (!confirm(`Delete all ${this.count()} applications? Export a backup first if you want to keep them.`)) return;
    this.apps.clear();
    this.dataMessage.set({ ok: true, text: 'All applications deleted. Your resume and settings are kept.' });
  }
}
