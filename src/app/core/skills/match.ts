import { normalizeText, scanSkills, skillSet } from './extract';
import { SkillCategory, skillDef } from './skills-dictionary';

export type Importance = 'required' | 'preferred' | 'mentioned';

export interface JdSkill {
  name: string;
  category: SkillCategory | 'other';
  importance: Importance;
  mentions: number;
  weight: number;
}

export interface MatchResult {
  /** 0-100, weighted by how important each skill is in the job description. */
  score: number;
  jdSkills: JdSkill[];
  matched: JdSkill[];
  missing: JdSkill[];
  /** Resume skills the job description does not ask for. */
  extra: string[];
}

const WEIGHTS: Record<Importance, number> = { required: 2, mentioned: 1.5, preferred: 1 };

const PREFERRED = /\b(nice[\s-]to[\s-]have|preferred|bonus|a plus|is a plus|desirable|good to have|extra credit|optional)\b/i;
const REQUIRED = /\b(requirements?|required|must[\s-]have|must|you have|you bring|what you('|’)?ll bring|qualifications|essential|minimum)\b/i;

const BULLET = /^\s*([-*•▪◦·]|\d+[.)])\s+/;
const SECTION = /\b(about|responsibilities|what you('|’)?ll do|the role|benefits|perks|we offer|who we are|stack|day[\s-]to[\s-]day)\b/i;

/**
 * Classifies a line as a section heading ("Requirements", "Nice to have:") or not (null).
 * A heading is not a bullet and either ends with a colon or is at most four words.
 */
function headingKind(line: string): Importance | null {
  const t = line.trim();
  if (!t || BULLET.test(line) || t.length > 60) return null;
  const heading = /:\s*$/.test(t) || t.split(/\s+/).length <= 4;
  if (!heading) return null;
  if (PREFERRED.test(t)) return 'preferred';
  if (REQUIRED.test(t)) return 'required';
  return /:\s*$/.test(t) || SECTION.test(t) ? 'mentioned' : null;
}

/** Works out whether a skill sits under "requirements", "nice to have" or neither. */
function importanceAt(lines: { start: number; text: string }[], index: number): Importance {
  let section: Importance = 'mentioned';
  let current = '';
  for (const line of lines) {
    if (line.start > index) break;
    current = line.text;
    section = headingKind(line.text) ?? section;
  }
  // An inline hint on the skill's own line ("Docker is a plus") beats the section heading.
  if (headingKind(current) === null) {
    if (PREFERRED.test(current)) return 'preferred';
    if (REQUIRED.test(current)) return 'required';
  }
  return section;
}

const RANK: Record<Importance, number> = { required: 3, mentioned: 2, preferred: 1 };

/** The skills a job description asks for, with how strongly it asks. */
export function jdSkills(jobDescription: string): JdSkill[] {
  const text = normalizeText(jobDescription);
  const lines: { start: number; text: string }[] = [];
  let pos = 0;
  for (const line of text.split('\n')) {
    lines.push({ start: pos, text: line });
    pos += line.length + 1;
  }
  const byName = new Map<string, JdSkill>();
  for (const occ of scanSkills(text)) {
    const importance = importanceAt(lines, occ.index);
    const prev = byName.get(occ.name);
    if (!prev) {
      byName.set(occ.name, { name: occ.name, category: skillDef(occ.name)?.category ?? 'other', importance, mentions: 1, weight: 0 });
    } else {
      prev.mentions++;
      if (RANK[importance] > RANK[prev.importance]) prev.importance = importance;
    }
  }
  return [...byName.values()].map((s) => ({
    ...s,
    // Repetition signals emphasis: a skill named 3+ times gets a small bump.
    weight: WEIGHTS[s.importance] + (s.mentions >= 3 ? 0.5 : 0),
  }));
}

/**
 * Deterministic ATS-style match: which of the job's skills the resume shows.
 * `resumeSkills` are canonical names (from the resume text plus the skills list).
 */
export function matchSkills(resumeSkills: Iterable<string>, jobDescription: string): MatchResult {
  const have = skillSet(resumeSkills);
  const wanted = jdSkills(jobDescription);
  const matched = wanted.filter((s) => have.has(s.name.toLowerCase()));
  const missing = wanted.filter((s) => !have.has(s.name.toLowerCase()));
  const total = wanted.reduce((sum, s) => sum + s.weight, 0);
  const got = matched.reduce((sum, s) => sum + s.weight, 0);
  const wantedNames = new Set(wanted.map((s) => s.name.toLowerCase()));
  const order = (a: JdSkill, b: JdSkill) => b.weight - a.weight || a.name.localeCompare(b.name);
  return {
    score: total ? Math.round((got / total) * 100) : 0,
    jdSkills: [...wanted].sort(order),
    matched: matched.sort(order),
    missing: missing.sort(order),
    extra: [...new Set([...resumeSkills])].filter((s) => !wantedNames.has(s.toLowerCase())),
  };
}

export function scoreBand(score: number): 'good' | 'ok' | 'bad' {
  return score >= 70 ? 'good' : score >= 45 ? 'ok' : 'bad';
}
