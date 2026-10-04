import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApplicationsStore } from '../../core/applications.store';
import { LlmService } from '../../core/llm/llm.service';
import { ProfileStore } from '../../core/profile.store';
import { Tone, coverLetterRequest } from '../../core/prompts';
import { SettingsStore } from '../../core/settings.store';
import { matchSkills } from '../../core/skills/match';
import { readJson, writeJson } from '../../core/storage';
import { downloadText } from '../../shared/download';

const DRAFT_KEY = 'hiretrack.letter';

@Component({
  selector: 'app-letter',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './letter.page.html',
  styleUrl: './letter.page.scss',
})
export class LetterPage {
  protected readonly profile = inject(ProfileStore);
  protected readonly apps = inject(ApplicationsStore);
  protected readonly settings = inject(SettingsStore);
  private readonly llm = inject(LlmService);

  protected readonly tones: { id: Tone; label: string; hint: string }[] = [
    { id: 'formal', label: 'Formal', hint: 'Polished, 3-4 paragraphs' },
    { id: 'friendly', label: 'Friendly', hint: 'Warm and conversational' },
    { id: 'concise', label: 'Concise', hint: 'Under 150 words' },
  ];

  protected readonly job = this.profile.job;
  protected readonly tone = signal<Tone>('formal');
  protected readonly letter = signal<string>(readJson<string>(DRAFT_KEY, ''));
  protected readonly streaming = signal(false);
  protected readonly error = signal('');
  protected readonly copied = signal(false);

  protected readonly match = computed(() => matchSkills(this.profile.profile().skills, this.job().jobDescription));
  protected readonly words = computed(() => (this.letter().match(/\S+/g) ?? []).length);

  private controller?: AbortController;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  protected pickApp(id: string): void {
    const app = this.apps.get(id);
    if (app) this.profile.setJob({ appId: app.id, company: app.company, role: app.role, jobDescription: app.jobDescription || this.job().jobDescription });
    else this.profile.setJob({ appId: '' });
  }

  protected setLetter(text: string): void {
    this.letter.set(text);
    writeJson(DRAFT_KEY, text);
  }

  protected async generate(): Promise<void> {
    this.controller?.abort();
    const controller = (this.controller = new AbortController());
    this.streaming.set(true);
    this.error.set('');
    this.setLetter('');
    try {
      const req = coverLetterRequest({
        profile: this.profile.profile(),
        jobDescription: this.job().jobDescription,
        company: this.job().company,
        role: this.job().role,
        tone: this.tone(),
        match: this.match(),
      });
      for await (const chunk of this.llm.stream(req, controller.signal)) {
        if (controller.signal.aborted) break;
        this.letter.update((t) => t + chunk);
      }
      this.setLetter(this.letter().trim());
    } catch (e) {
      if (!controller.signal.aborted) this.error.set((e as Error).message);
    } finally {
      if (this.controller === controller) this.streaming.set(false);
    }
  }

  protected stop(): void {
    this.controller?.abort();
    this.streaming.set(false);
    this.setLetter(this.letter());
  }

  private fileName(ext: string): string {
    const slug = `cover-letter-${this.job().company || 'draft'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    return `${slug}.${ext}`;
  }

  protected download(kind: 'txt' | 'md'): void {
    const text = this.letter();
    if (kind === 'txt') downloadText(this.fileName('txt'), text);
    else {
      const title = `# Cover letter${this.job().role ? `: ${this.job().role}` : ''}${this.job().company ? ` at ${this.job().company}` : ''}`;
      downloadText(this.fileName('md'), `${title}\n\n${text}\n`, 'text/markdown');
    }
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.letter());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.error.set('Copy failed. Select the text and copy it manually.');
    }
  }
}
