import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Header shared by the board, table and calendar views. */
@Component({
  selector: 'app-pipeline-tabs',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>{{ heading() }}</h1>
        <p class="muted">{{ sub() }}</p>
      </div>
      <span class="spacer"></span>
      <div class="tabs" role="group" aria-label="Pipeline view">
        <a routerLink="/board" routerLinkActive="on" ariaCurrentWhenActive="page">Board</a>
        <a routerLink="/table" routerLinkActive="on" ariaCurrentWhenActive="page">Table</a>
        <a routerLink="/calendar" routerLinkActive="on" ariaCurrentWhenActive="page">Calendar</a>
      </div>
      <a class="btn primary" routerLink="/app/new">+ Add application</a>
    </div>
  `,
  styles: `
    .tabs {
      display: inline-flex;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 3px;
      a {
        padding: 0.35rem 0.8rem;
        border-radius: 7px;
        text-decoration: none;
        color: var(--muted);
        font-weight: 600;
        &.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
        &:focus-visible { outline: 2px solid var(--accent); }
      }
    }
  `,
})
export class PipelineTabs {
  readonly heading = input.required<string>();
  readonly sub = input('');
}
