import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileStore } from '../../core/profile.store';
import { readResumeFile } from '../../core/resume/pdf';
import { canonicalSkill } from '../../core/skills/extract';
import { CATEGORY_LABELS, SkillCategory, skillDef } from '../../core/skills/skills-dictionary';
import { pickedFile } from '../../shared/download';

@Component({
  selector: 'app-resume',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resume.page.html',
  styleUrl: './resume.page.scss',
})
export class ResumePage {
  protected readonly store = inject(ProfileStore);

  protected readonly text = signal(this.store.profile().rawText);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly newSkill = signal('');

  protected readonly dirty = computed(() => this.text().trim() !== this.store.profile().rawText.trim());

  protected readonly skillGroups = computed(() => {
    const groups = new Map<string, string[]>();
    for (const s of this.store.profile().skills) {
      const cat = skillDef(s)?.category;
      const label = cat ? CATEGORY_LABELS[cat as SkillCategory] : 'Other';
      groups.set(label, [...(groups.get(label) ?? []), s]);
    }
    return [...groups.entries()].map(([label, skills]) => ({ label, skills }));
  });

  protected readonly contactLine = computed(() => {
    const p = this.store.profile();
    return [p.email, p.phone, p.location].filter((x) => !!x).join(' · ');
  });

  protected parse(): void {
    if (!this.text().trim()) return;
    const custom = this.store.profile().skills.filter((s) => !skillDef(s));
    this.store.setResumeText(this.text(), custom);
    this.message.set(`Parsed: ${this.store.profile().experience.length} roles, ${this.store.profile().skills.length} skills.`);
  }

  protected async upload(event: Event): Promise<void> {
    const file = pickedFile(event);
    if (!file) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const text = await readResumeFile(file);
      if (!text.trim()) throw new Error('No text found. If this is a scanned PDF, paste the text instead.');
      this.text.set(text);
      this.store.setResumeText(text);
      this.message.set(`Read ${file.name}: ${this.store.profile().experience.length} roles, ${this.store.profile().skills.length} skills.`);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected addSkill(): void {
    const s = canonicalSkill(this.newSkill());
    if (!s) return;
    const skills = this.store.profile().skills;
    if (!skills.some((x) => x.toLowerCase() === s.toLowerCase())) this.store.update({ skills: [...skills, s] });
    this.newSkill.set('');
  }

  protected removeSkill(skill: string): void {
    this.store.update({ skills: this.store.profile().skills.filter((s) => s !== skill) });
  }

  protected loadDemo(): void {
    this.store.loadDemo();
    this.text.set(this.store.profile().rawText);
    this.message.set('Loaded the demo resume.');
  }
}
