import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { funnel, ghostedCandidates, kpis, responseRateBySource, timeInStage, weeklyApplications } from '../../core/analytics';
import { ApplicationsStore } from '../../core/applications.store';
import { statusLabel } from '../../core/models';
import { SettingsStore } from '../../core/settings.store';
import { BarRow, Column, ColumnChart, HBarChart } from '../../shared/charts';
import { percent } from '../../shared/format';

@Component({
  selector: 'app-analytics',
  imports: [RouterLink, HBarChart, ColumnChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.scss',
})
export class AnalyticsPage {
  private readonly store = inject(ApplicationsStore);
  protected readonly settings = inject(SettingsStore);
  protected readonly percent = percent;
  protected readonly statusLabel = statusLabel;

  protected readonly kpis = computed(() => kpis(this.store.all()));
  protected readonly funnel = computed(() => funnel(this.store.all()));
  protected readonly sources = computed(() => responseRateBySource(this.store.all()));
  protected readonly stages = computed(() => timeInStage(this.store.all()));
  protected readonly weeks = computed(() => weeklyApplications(this.store.all(), 8));
  protected readonly ghosts = computed(() => ghostedCandidates(this.store.all(), this.settings.settings().ghostDays));

  protected readonly funnelRows = computed<BarRow[]>(() => this.funnel().map((s, i) => ({
    label: statusLabel(s.status),
    value: s.count,
    display: String(s.count),
    note: i === 0 ? 'starting point' : `${percent(s.conversion)} of previous step · ${percent(s.overall)} overall`,
    tip: `${statusLabel(s.status)}: ${s.count} applications${i ? `, ${percent(s.conversion)} conversion from ${statusLabel(this.funnel()[i - 1].status)}` : ''}`,
  })));

  protected readonly sourceRows = computed<BarRow[]>(() => this.sources().map((s) => ({
    label: s.source,
    value: s.rate * 100,
    display: percent(s.rate),
    note: `${s.responded} of ${s.applied} replied`,
    tip: `${s.source}: ${s.responded} of ${s.applied} applications got a response (${percent(s.rate)})`,
  })));

  protected readonly stageRows = computed<BarRow[]>(() => this.stages().filter((s) => s.samples).map((s) => ({
    label: statusLabel(s.status),
    value: s.avgDays,
    display: `${s.avgDays} d`,
    note: `${s.samples} completed stay${s.samples === 1 ? '' : 's'}`,
    tip: `${statusLabel(s.status)}: ${s.avgDays} days on average before moving on (${s.samples} samples)`,
  })));

  protected readonly weekColumns = computed<Column[]>(() => this.weeks().map((w) => {
    const d = new Date(`${w.week}T12:00:00`);
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: w.count, tip: `Week of ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}: ${w.count} applications` };
  }));

  protected readonly weeksOnGoal = computed(() => this.weeks().filter((w) => w.count >= this.settings.settings().weeklyGoal).length);

  protected readonly bestSource = computed(() => this.sources().filter((s) => s.applied >= 3)[0]);
}
