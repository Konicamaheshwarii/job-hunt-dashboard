import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NotifierService } from './core/notifier.service';
import { PROVIDERS, SettingsStore } from './core/settings.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#main" (click)="skip($event)">Skip to content</a>
    <header class="top">
      <a routerLink="/" class="brand" aria-label="HireTrack home">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--accent)" />
          <path d="M7 15.5l3.2-3.2 2.6 2.6L17.5 10" stroke="var(--accent-text)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        HireTrack
      </a>
      <nav aria-label="Main">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Today</a>
        <a routerLink="/board" routerLinkActive="active" [class.active]="inPipeline()">Pipeline</a>
        <a routerLink="/analytics" routerLinkActive="active">Analytics</a>
        <a routerLink="/resume" routerLinkActive="active">Resume</a>
        <a routerLink="/match" routerLinkActive="active">Match</a>
        <a routerLink="/letter" routerLinkActive="active">Cover letter</a>
        <a routerLink="/settings" routerLinkActive="active">Settings</a>
      </nav>
      <a routerLink="/settings" class="chip provider" [title]="'AI provider: ' + providerLabel()">{{ providerLabel() }}</a>
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>
  `,
  styleUrl: './app.scss',
})
export class App {
  private readonly settings = inject(SettingsStore);
  private readonly notifier = inject(NotifierService);
  protected readonly providerLabel = computed(
    () => PROVIDERS.find((p) => p.id === this.settings.provider())?.label.split(' (')[0] ?? '');
  private readonly url = toSignal(
    inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd), map((e) => e.urlAfterRedirects)),
    { initialValue: '' },
  );
  protected readonly inPipeline = computed(() => /^\/(board|table|calendar|app)\b/.test(this.url()));

  constructor() {
    // One reminder summary per day, only if the user opted in.
    queueMicrotask(() => this.notifier.notifyDue());
  }

  protected skip(e: Event): void {
    e.preventDefault();
    document.getElementById('main')?.focus();
  }
}
