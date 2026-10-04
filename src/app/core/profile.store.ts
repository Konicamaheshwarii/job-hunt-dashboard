import { Injectable, computed, effect, signal } from '@angular/core';
import { Profile } from './models';
import { parseResume } from './resume/parse';
import { DEMO_JD, DEMO_RESUME } from './seed';
import { readJson, writeJson } from './storage';

const KEY = 'hiretrack.profile';
const JOB_KEY = 'hiretrack.job';

/** The job you are currently matching against, shared by the Match and Cover letter pages. */
export interface JobDraft {
  appId: string;
  company: string;
  role: string;
  jobDescription: string;
}

const DEMO_JOB: JobDraft = { appId: 'seed-0', company: 'Lumenfield Health', role: 'Senior Angular Engineer', jobDescription: DEMO_JD };

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly state = signal<Profile>(readJson<Profile | null>(KEY, null) ?? parseResume(DEMO_RESUME));
  private readonly jobState = signal<JobDraft>(readJson<JobDraft>(JOB_KEY, DEMO_JOB));

  readonly profile = this.state.asReadonly();
  readonly job = this.jobState.asReadonly();
  readonly hasResume = computed(() => this.state().rawText.trim().length > 0);

  constructor() {
    effect(() => writeJson(KEY, this.state()));
    effect(() => writeJson(JOB_KEY, this.jobState()));
  }

  /** Re-parses the resume text, keeping skills the user added by hand. */
  setResumeText(text: string, keepSkills: string[] = []): void {
    const parsed = parseResume(text);
    const skills = [...new Set([...parsed.skills, ...keepSkills])];
    this.state.set({ ...parsed, skills });
  }

  update(patch: Partial<Profile>): void {
    this.state.update((p) => ({ ...p, ...patch }));
  }

  setJob(patch: Partial<JobDraft>): void {
    this.jobState.update((j) => ({ ...j, ...patch }));
  }

  loadDemo(): void {
    this.state.set(parseResume(DEMO_RESUME));
    this.jobState.set(DEMO_JOB);
  }
}
