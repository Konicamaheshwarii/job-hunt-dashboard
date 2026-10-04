import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationsStore } from '../../core/applications.store';
import { LlmService } from '../../core/llm/llm.service';
import { ProfileStore } from '../../core/profile.store';
import { GapAnalysis, gapAnalysisRequest, parseGapAnalysis } from '../../core/prompts';
import { Importance, matchSkills, scoreBand } from '../../core/skills/match';
import { ValidationResult, validateSuggestions } from '../../core/skills/validate';
import { SettingsStore } from '../../core/settings.store';

const IMPORTANCE_LABEL: Record<Importance, string> = { required: 'Required', mentioned: 'Mentioned', preferred: 'Nice to have' };

@Component({
  selector: 'app-match',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './match.page.html',
  styleUrl: './match.page.scss',
})
export class MatchPage {
  protected readonly profile = inject(ProfileStore);
  protected readonly apps = inject(ApplicationsStore);
  protected readonly settings = inject(SettingsStore);
  private readonly llm = inject(LlmService);

  protected readonly importanceLabel = IMPORTANCE_LABEL;
  protected readonly job = this.profile.job;

  protected readonly match = computed(() => matchSkills(this.profile.profile().skills, this.job().jobDescription));
  protected readonly band = computed(() => scoreBand(this.match().score));
  protected readonly linkedApp = computed(() => this.apps.get(this.job().appId));

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly analysis = signal<GapAnalysis | null>(null);
  protected readonly checked = signal<ValidationResult | null>(null);
  protected readonly savedScore = signal(false);
  protected readonly copied = signal(-1);

  private controller?: AbortController;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  protected setJd(value: string): void {
    this.profile.setJob({ jobDescription: value });
    this.analysis.set(null);
    this.checked.set(null);
    this.savedScore.set(false);
  }

  protected pickApp(id: string): void {
    const app = this.apps.get(id);
    this.profile.setJob(app
      ? { appId: app.id, company: app.company, role: app.role, jobDescription: app.jobDescription || this.job().jobDescription }
      : { appId: '' });
    this.analysis.set(null);
    this.checked.set(null);
    this.savedScore.set(false);
  }

  protected saveScore(): void {
    const app = this.linkedApp();
    if (!app) return;
    this.apps.save({ ...app, matchScore: this.match().score, jobDescription: this.job().jobDescription });
    this.savedScore.set(true);
  }

  protected async analyze(): Promise<void> {
    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.loading.set(true);
    this.error.set('');
    this.analysis.set(null);
    this.checked.set(null);
    try {
      const profile = this.profile.profile();
      const reply = await this.llm.complete(gapAnalysisRequest({ profile, jobDescription: this.job().jobDescription, match: this.match() }), controller.signal);
      if (controller.signal.aborted) return;
      const analysis = parseGapAnalysis(reply);
      this.analysis.set(analysis);
      // Never trust rewrites blindly: drop any that add skills or figures the resume does not contain.
      this.checked.set(validateSuggestions(analysis.suggestions, profile.rawText, profile.skills));
    } catch (e) {
      if (!controller.signal.aborted) this.error.set((e as Error).message);
    } finally {
      if (this.controller === controller) this.loading.set(false);
    }
  }

  protected async copy(text: string, i: number): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(i);
      setTimeout(() => this.copied.set(-1), 1500);
    } catch {
      this.copied.set(-1);
    }
  }
}
