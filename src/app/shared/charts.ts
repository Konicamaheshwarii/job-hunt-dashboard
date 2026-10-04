import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

/** Tracks the host element's width so SVGs draw at 1:1 pixels (text never scales down on phones). */
function hostWidth(fallback = 600) {
  const width = signal(fallback);
  const el = inject(ElementRef).nativeElement as HTMLElement;
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    const measure = () => width.set(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    destroyRef.onDestroy(() => ro.disconnect());
  });
  return width;
}

export interface BarRow {
  label: string;
  value: number;
  /** Text shown at the end of the bar. */
  display: string;
  /** Optional muted note under the label (e.g. "48% of previous step"). */
  note?: string;
  /** Hover / screen reader text. */
  tip: string;
}

/** Horizontal bars with the label above each bar and the value at its end. */
@Component({
  selector: 'app-hbar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block' },
  template: `
    <svg class="chart" [attr.viewBox]="'0 0 ' + w() + ' ' + height()" [attr.height]="height()" role="img" [attr.aria-label]="label()">
      @for (r of layout(); track r.label) {
        <g class="mark" tabindex="0" [attr.aria-label]="r.tip">
          <title>{{ r.tip }}</title>
          <text class="label" x="0" [attr.y]="r.y + 12">{{ r.label }}</text>
          @if (r.note) { <text [attr.x]="w()" [attr.y]="r.y + 12" text-anchor="end">{{ r.note }}</text> }
          <rect class="bar-soft" x="0" [attr.y]="r.y + 18" [attr.width]="w()" height="14" rx="4" />
          <rect class="bar" x="0" [attr.y]="r.y + 18" [attr.width]="r.bw" height="14" rx="4" />
          <text [attr.x]="r.tx" [attr.y]="r.y + 29" [attr.text-anchor]="r.inside ? 'end' : 'start'"
                [style.fill]="r.inside ? 'var(--accent-text)' : null" class="value">{{ r.display }}</text>
        </g>
      }
    </svg>
  `,
  styles: `.value { font-weight: 700; } .mark { outline: none; } .mark:focus-visible .bar { stroke: var(--text); stroke-width: 2; }`,
})
export class HBarChart {
  readonly rows = input.required<BarRow[]>();
  readonly label = input('Bar chart');
  /** Value that fills the full width (defaults to the largest value). */
  readonly max = input<number | undefined>(undefined);

  protected readonly w = hostWidth();
  protected readonly height = computed(() => this.rows().length * 46);

  protected readonly layout = computed(() => {
    const rows = this.rows();
    const max = this.max() ?? Math.max(1, ...rows.map((r) => r.value));
    const w = this.w();
    return rows.map((r, i) => {
      const bw = r.value > 0 ? Math.max(6, (r.value / max) * w) : 0;
      const inside = bw > 70;
      return { ...r, y: i * 46, bw, inside, tx: inside ? bw - 6 : bw + 6 };
    });
  });
}

export interface Column {
  label: string;
  value: number;
  tip: string;
}

/** Vertical columns with an optional dashed goal line. */
@Component({
  selector: 'app-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block' },
  template: `
    <svg class="chart" [attr.viewBox]="'0 0 ' + w() + ' ' + H" [attr.height]="H" role="img" [attr.aria-label]="label()">
      @for (t of ticks(); track t.v) {
        <line class="grid" [attr.x1]="PAD" [attr.x2]="w()" [attr.y1]="t.y" [attr.y2]="t.y" />
        <text [attr.x]="PAD - 6" [attr.y]="t.y + 4" text-anchor="end">{{ t.v }}</text>
      }
      @for (c of layout(); track c.label) {
        <g class="mark" tabindex="0" [attr.aria-label]="c.tip">
          <title>{{ c.tip }}</title>
          <rect fill="transparent" [attr.x]="c.x - c.gap / 2" y="0" [attr.width]="c.bw + c.gap" [attr.height]="H - 20" />
          @if (c.h > 0) { <path class="bar" [attr.d]="c.path" /> }
          @if (c.value > 0) { <text class="label" [attr.x]="c.x + c.bw / 2" [attr.y]="c.top - 5" text-anchor="middle">{{ c.value }}</text> }
          <text [attr.x]="c.x + c.bw / 2" [attr.y]="H - 4" text-anchor="middle">{{ c.label }}</text>
        </g>
      }
      @if (goalY() !== null) {
        <line class="goal" [attr.x1]="PAD" [attr.x2]="w()" [attr.y1]="goalY()" [attr.y2]="goalY()" />
        <text class="label" [attr.x]="w()" [attr.y]="goalY()! - 5" text-anchor="end">Goal {{ goal() }}/week</text>
      }
    </svg>
  `,
  styles: `.mark { outline: none; } .mark:focus-visible .bar { stroke: var(--text); stroke-width: 2; }`,
})
export class ColumnChart {
  readonly columns = input.required<Column[]>();
  readonly goal = input<number | undefined>(undefined);
  readonly label = input('Column chart');

  protected readonly H = 200;
  protected readonly PAD = 28;
  protected readonly w = hostWidth();

  private readonly max = computed(() => Math.max(1, this.goal() ?? 0, ...this.columns().map((c) => c.value)) * 1.15);
  private readonly y = (v: number) => (this.H - 20) - (v / this.max()) * (this.H - 40);

  protected readonly ticks = computed(() => {
    const max = this.max();
    const step = max > 20 ? 10 : max > 8 ? 5 : 2;
    const out = [];
    for (let v = 0; v <= max; v += step) out.push({ v, y: this.y(v) });
    return out;
  });

  protected readonly goalY = computed(() => (this.goal() ? this.y(this.goal()!) : null));

  protected readonly layout = computed(() => {
    const cols = this.columns();
    const slot = (this.w() - this.PAD) / Math.max(1, cols.length);
    const bw = Math.min(42, slot * 0.6);
    const base = this.H - 20;
    return cols.map((c, i) => {
      const x = this.PAD + i * slot + (slot - bw) / 2;
      const top = this.y(c.value);
      const h = base - top;
      const r = Math.min(4, h, bw / 2);
      // Rounded top corners only; the bar sits flat on the baseline.
      const path = `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z`;
      return { ...c, x, bw, top, h, path, gap: slot - bw };
    });
  });
}
