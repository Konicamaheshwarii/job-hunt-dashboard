import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationsStore } from '../../core/applications.store';
import { interviewsToIcs } from '../../core/io/ics';
import { ymd } from '../../core/models';
import { reminders } from '../../core/reminders';
import { SettingsStore } from '../../core/settings.store';
import { downloadText } from '../../shared/download';
import { PipelineTabs } from '../../shared/pipeline-tabs';

type EventKind = 'interview' | 'action' | 'follow-up';

interface CalEvent {
  day: string;
  time?: string;
  kind: EventKind;
  title: string;
  sub: string;
  appId: string;
}

const KIND_LABEL: Record<EventKind, string> = { interview: 'Interview', action: 'Next action', 'follow-up': 'Follow-up' };

@Component({
  selector: 'app-calendar',
  imports: [RouterLink, PipelineTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
})
export class CalendarPage {
  private readonly store = inject(ApplicationsStore);
  private readonly settings = inject(SettingsStore);

  protected readonly kindLabel = KIND_LABEL;
  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly today = ymd(Date.now());
  protected readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly selected = signal<string>(this.today);

  protected readonly events = computed<CalEvent[]>(() => {
    const apps = this.store.all();
    const out: CalEvent[] = [];
    for (const a of apps) {
      for (const iv of a.interviews) {
        const d = new Date(iv.date);
        out.push({ day: ymd(d), time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), kind: 'interview',
          title: `${iv.kind} · ${a.company}`, sub: a.role, appId: a.id });
      }
      if (a.nextAction && a.nextActionDate) {
        out.push({ day: a.nextActionDate, kind: 'action', title: a.nextAction, sub: a.company, appId: a.id });
      }
    }
    for (const r of reminders(apps, this.settings.settings())) {
      if (r.kind === 'next-action' || r.kind === 'prepare') continue;
      out.push({ day: r.due < this.today ? this.today : r.due, kind: 'follow-up', title: r.title, sub: r.detail, appId: r.appId });
    }
    return out.sort((x, y) => x.day.localeCompare(y.day) || (x.time ?? '').localeCompare(y.time ?? ''));
  });

  protected readonly title = computed(() => this.month().toLocaleDateString([], { month: 'long', year: 'numeric' }));

  protected readonly weeks = computed(() => {
    const first = this.month();
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    const byDay = new Map<string, CalEvent[]>();
    for (const e of this.events()) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
    const weeks: { day: string; date: number; inMonth: boolean; events: CalEvent[] }[][] = [];
    const cursor = new Date(start);
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key = ymd(cursor);
        week.push({ day: key, date: cursor.getDate(), inMonth: cursor.getMonth() === first.getMonth(), events: byDay.get(key) ?? [] });
        cursor.setDate(cursor.getDate() + 1);
      }
      if (w >= 4 && !week.some((d) => d.inMonth)) break;
      weeks.push(week);
    }
    return weeks;
  });

  protected readonly dayEvents = computed(() => this.events().filter((e) => e.day === this.selected()));

  protected readonly upcoming = computed(() => {
    const until = ymd(Date.now() + 14 * 86_400_000);
    return this.events().filter((e) => e.day >= this.today && e.day <= until);
  });

  protected shift(months: number): void {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + months, 1));
  }

  protected goToday(): void {
    const now = new Date();
    this.month.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.selected.set(this.today);
  }

  protected dayLabel(day: string): string {
    return new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  protected exportIcs(): void {
    downloadText('hiretrack-interviews.ics', interviewsToIcs(this.store.all(), { onlyUpcoming: true }), 'text/calendar');
  }
}
