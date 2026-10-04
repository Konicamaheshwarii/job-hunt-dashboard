import { SKILLS, SkillDef, skillDef } from './skills-dictionary';

export interface SkillOccurrence {
  name: string;
  index: number;
  length: number;
}

interface Pattern {
  skill: string;
  regex: RegExp;
  size: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s-]+');
// A skill must not touch other word characters: "Java" is not found inside "JavaScript",
// but "Node.js." at the end of a sentence still matches.
const BEFORE = '(?<![\\w+#.])';
const AFTER = '(?![\\w+#]|\\.\\w)';

function patternsFor(def: SkillDef): Pattern[] {
  const insensitive = [...(def.exactName ? [] : [def.name]), ...(def.aliases ?? [])];
  const sensitive = def.exact ?? [];
  return [
    ...insensitive.map((p) => ({ skill: def.name, size: p.length, regex: new RegExp(BEFORE + escape(p) + AFTER, 'gi') })),
    ...sensitive.map((p) => ({ skill: def.name, size: p.length, regex: new RegExp(BEFORE + escape(p) + AFTER, 'g') })),
  ];
}

// Longest phrases first, so "React Native" claims its text before "React" can.
const PATTERNS: Pattern[] = SKILLS.flatMap(patternsFor).sort((a, b) => b.size - a.size);

/** Every place a known skill (or one of its synonyms) appears in the text. */
export function scanSkills(text: string): SkillOccurrence[] {
  let masked = normalizeText(text);
  const found: SkillOccurrence[] = [];
  for (const p of PATTERNS) {
    p.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    const hits: SkillOccurrence[] = [];
    while ((m = p.regex.exec(masked))) {
      hits.push({ name: p.skill, index: m.index, length: m[0].length });
      if (!m[0].length) p.regex.lastIndex++;
    }
    for (const h of hits) masked = masked.slice(0, h.index) + ' '.repeat(h.length) + masked.slice(h.index + h.length);
    found.push(...hits);
  }
  return found.sort((a, b) => a.index - b.index);
}

/** Canonical skill names found in the text, in order of first appearance. */
export function extractSkills(text: string): string[] {
  return [...new Set(scanSkills(text).map((o) => o.name))];
}

/**
 * Maps a skill a user typed ("ReactJS", "k8s", "Figma") to its canonical name.
 * Unknown skills are kept as typed so custom skills still count.
 */
export function canonicalSkill(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const known = skillDef(trimmed);
  if (known) return known.name;
  const found = extractSkills(trimmed);
  return found.length === 1 ? found[0] : trimmed;
}

/** Case-insensitive set of canonical skill names. */
export function skillSet(names: Iterable<string>): Set<string> {
  return new Set([...names].map((n) => canonicalSkill(n).toLowerCase()).filter(Boolean));
}

/** Unicode-normalizes text and folds fancy dashes, keeping offsets stable for scanSkills. */
export function normalizeText(text: string): string {
  return text.normalize('NFKC').replace(/[\u2010-\u2015]/g, '-');
}
