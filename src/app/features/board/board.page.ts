import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ghostedCandidates } from '../../core/analytics';
import { ApplicationsStore } from '../../core/applications.store';
import { Application, STATUSES, Status, daysBetween, statusLabel } from '../../core/models';
import { SettingsStore } from '../../core/settings.store';
import { AgoPipe, SalaryPipe } from '../../shared/format';
import { PipelineTabs } from '../../shared/pipeline-tabs';

@Component({
  selector: 'app-board',
  imports: [RouterLink, PipelineTabs, SalaryPipe, AgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board.page.html',
  styleUrl: './board.page.scss',
})
export class BoardPage {
  private readonly store = inject(ApplicationsStore);
  private readonly settings = inject(SettingsStore);

  protected readonly statuses = STATUSES;
  protected readonly query = signal('');
  protected readonly dragging = signal<string | null>(null);
  protected readonly over = signal<Status | null>(null);
  protected readonly announcement = signal('');

  private readonly ghosts = computed(() =>
    new Map(ghostedCandidates(this.store.all(), this.settings.settings().ghostDays).map((g) => [g.app.id, g.quietDays])));

  protected readonly columns = computed(() => {
    const q = this.query().trim().toLowerCase();
    const apps = this.store.all().filter((a) => !q || `${a.company} ${a.role} ${a.location}`.toLowerCase().includes(q));
    return STATUSES.map((s) => ({
      ...s,
      apps: apps
        .filter((a) => a.status === s.id)
        .sort((a, b) => (b.history.at(-1)?.date ?? '').localeCompare(a.history.at(-1)?.date ?? '')),
    }));
  });

  /** Days without activity, if the ghosted detector flags this application. */
  protected quietDays(app: Application): number | undefined {
    return this.ghosts().get(app.id);
  }

  protected daysInStage(app: Application): number {
    return daysBetween(app.history.at(-1)?.date ?? app.createdAt, Date.now());
  }

  protected nextInterview(app: Application): string | undefined {
    const now = Date.now();
    return app.interviews.map((i) => i.date).filter((d) => new Date(d).getTime() > now).sort()[0];
  }

  protected onDragStart(e: DragEvent, app: Application): void {
    e.dataTransfer?.setData('text/plain', app.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    this.dragging.set(app.id);
  }

  protected onDragOver(e: DragEvent, status: Status): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.over.set(status);
  }

  protected onDrop(e: DragEvent, status: Status): void {
    e.preventDefault();
    const id = e.dataTransfer?.getData('text/plain') || this.dragging();
    if (id) this.moveTo(id, status);
    this.dragging.set(null);
    this.over.set(null);
  }

  protected onDragEnd(): void {
    this.dragging.set(null);
    this.over.set(null);
  }

  protected moveTo(id: string, status: Status | string): void {
    const app = this.store.get(id);
    if (!app || app.status === status) return;
    this.store.move(id, status as Status);
    this.announcement.set(`${app.company} moved to ${statusLabel(status as Status)}.`);
  }
}
