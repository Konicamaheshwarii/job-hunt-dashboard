import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ghostedCandidates, kpis, weeklyApplications } from '../../core/analytics';
import { ApplicationsStore } from '../../core/applications.store';
import { interviewsToIcs } from '../../core/io/ics';
import { NotifierService } from '../../core/notifier.service';
import { Reminder, reminders } from '../../core/reminders';
import { SettingsStore } from '../../core/settings.store';
import { downloadText } from '../../shared/download';
import { percent } from '../../shared/format';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  protected readonly store = inject(ApplicationsStore);
  protected readonly settings = inject(SettingsStore);
  protected readonly notifier = inject(NotifierService);
  protected readonly percent = percent;

  protected readonly kpis = computed(() => kpis(this.store.all()));
  protected readonly reminders = computed(() => reminders(this.store.all(), this.settings.settings()));
  protected readonly ghosts = computed(() => ghostedCandidates(this.store.all(), this.settings.settings().ghostDays));
  protected readonly thisWeek = computed(() => weeklyApplications(this.store.all(), 1)[0].count);
  protected readonly goal = computed(() => this.settings.settings().weeklyGoal);

  protected readonly interviews = computed(() => {
    const now = Date.now();
    return this.store.all()
      .flatMap((app) => app.interviews.map((iv) => ({ app, iv, t: new Date(iv.date).getTime() })))
      .filter((x) => x.t > now && x.t < now + 14 * 86_400_000)
      .sort((a, b) => a.t - b.t);
  });

  protected companyOf(r: Reminder): string {
    return this.store.get(r.appId)?.company ?? '';
  }

  protected when(iso: string): string {
    return new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected canLogFollowUp(r: Reminder): boolean {
    return r.kind === 'follow-up' || r.kind === 'update' || r.kind === 'thank-you';
  }

  protected markGhosted(id: string): void {
    this.store.move(id, 'ghosted');
  }

  protected exportIcs(): void {
    downloadText('hiretrack-interviews.ics', interviewsToIcs(this.store.all(), { onlyUpcoming: true }), 'text/calendar');
  }

  protected async toggleNotifications(): Promise<void> {
    if (this.notifier.enabled()) this.notifier.disable();
    else await this.notifier.enable();
  }
}
