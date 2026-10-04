import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationsStore } from '../../core/applications.store';
import { Application, OPEN_STATUSES, STATUSES, enteredAt, lastActivity } from '../../core/models';
import { AgoPipe, SalaryPipe, StatusLabelPipe } from '../../shared/format';
import { PipelineTabs } from '../../shared/pipeline-tabs';

type SortKey = 'company' | 'status' | 'source' | 'location' | 'salary' | 'applied' | 'activity' | 'next' | 'match';

interface Column { key: SortKey; label: string }

const STATUS_ORDER = STATUSES.map((s) => s.id);

@Component({
  selector: 'app-table',
  imports: [RouterLink, PipelineTabs, SalaryPipe, AgoPipe, StatusLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table.page.html',
  styleUrl: './table.page.scss',
})
export class TablePage {
  private readonly store = inject(ApplicationsStore);

  protected readonly statuses = STATUSES;
  protected readonly columns: Column[] = [
    { key: 'company', label: 'Company / role' },
    { key: 'status', label: 'Status' },
    { key: 'source', label: 'Source' },
    { key: 'location', label: 'Location' },
    { key: 'salary', label: 'Salary' },
    { key: 'applied', label: 'Applied' },
    { key: 'activity', label: 'Last activity' },
    { key: 'next', label: 'Next action' },
    { key: 'match', label: 'Match' },
  ];

  protected readonly query = signal('');
  protected readonly status = signal<string>('all');
  protected readonly source = signal<string>('all');
  protected readonly mode = signal<string>('all');
  protected readonly sort = signal<{ key: SortKey; dir: 1 | -1 }>({ key: 'activity', dir: -1 });

  protected readonly sources = computed(() => [...new Set(this.store.all().map((a) => a.source))].sort());

  private value(a: Application, key: SortKey): string | number {
    switch (key) {
      case 'company': return a.company.toLowerCase();
      case 'status': return STATUS_ORDER.indexOf(a.status);
      case 'source': return a.source.toLowerCase();
      case 'location': return (a.workMode === 'remote' ? 'remote' : a.location).toLowerCase();
      case 'salary': return a.salaryMax ?? a.salaryMin ?? -1;
      case 'applied': return enteredAt(a, 'applied') ?? '';
      case 'activity': return lastActivity(a);
      case 'next': return a.nextActionDate ?? '9999';
      case 'match': return a.matchScore ?? -1;
    }
  }

  protected readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const { key, dir } = this.sort();
    return this.store.all()
      .filter((a) => !q || `${a.company} ${a.role} ${a.location} ${a.notes} ${a.contacts.map((c) => c.name).join(' ')}`.toLowerCase().includes(q))
      .filter((a) => this.status() === 'all' || (this.status() === 'active' ? OPEN_STATUSES.includes(a.status) : a.status === this.status()))
      .filter((a) => this.source() === 'all' || a.source === this.source())
      .filter((a) => this.mode() === 'all' || a.workMode === this.mode())
      .map((a) => ({ app: a, applied: enteredAt(a, 'applied'), activity: lastActivity(a) }))
      .sort((x, y) => {
        const a = this.value(x.app, key);
        const b = this.value(y.app, key);
        return (a < b ? -1 : a > b ? 1 : 0) * dir || x.app.company.localeCompare(y.app.company);
      });
  });

  protected sortBy(key: SortKey): void {
    this.sort.update((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'company' || key === 'source' || key === 'location' || key === 'next' ? 1 : -1 }));
  }

  protected ariaSort(key: SortKey): string {
    const s = this.sort();
    return s.key !== key ? 'none' : s.dir === 1 ? 'ascending' : 'descending';
  }

  protected clear(): void {
    this.query.set('');
    this.status.set('all');
    this.source.set('all');
    this.mode.set('all');
  }
}
