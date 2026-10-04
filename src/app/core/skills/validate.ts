import { extractSkills, skillSet } from './extract';

export interface BulletSuggestion {
  /** The resume bullet being rephrased. */
  original: string;
  suggestion: string;
  /** Why this phrasing fits the job better. */
  reason?: string;
}

export interface RejectedSuggestion {
  suggestion: BulletSuggestion;
  why: string;
}

export interface ValidationResult {
  accepted: BulletSuggestion[];
  rejected: RejectedSuggestion[];
}

const tokens = (s: string) => s.toLowerCase().match(/[a-z0-9+#]+/g) ?? [];

/** Figures like "40%", "$1.2M", "3x", "12" that a rewrite must not make up. */
export function figures(text: string): string[] {
  return (text.match(/[$€£]?\d[\d,.]*\s?(%|x\b|k\b|m\b|ms\b|s\b)?/gi) ?? [])
    .map((f) => f.toLowerCase().replace(/[\s,]/g, '').replace(/\.$/, ''))
    .filter(Boolean);
}

/** How much of `a`'s vocabulary appears in `b` (0-1). */
function overlap(a: string, b: string): number {
  const ta = new Set(tokens(a));
  if (!ta.size) return 0;
  const tb = new Set(tokens(b));
  return [...ta].filter((t) => tb.has(t)).length / ta.size;
}

/** Finds the resume line a suggestion claims to rephrase (exact, or close enough after AI reformatting). */
export function findSourceLine(original: string, resumeText: string): string | undefined {
  const lines = resumeText.split('\n').map((l) => l.replace(/^\s*[-*•▪◦·]\s*/, '').trim()).filter((l) => l.length > 10);
  let best: { line: string; score: number } | undefined;
  for (const line of lines) {
    const score = Math.min(overlap(original, line), overlap(line, original) + 0.2);
    if (!best || score > best.score) best = { line, score };
  }
  return best && best.score >= 0.6 ? best.line : undefined;
}

/**
 * Keeps only rewrites that rephrase the resume. A suggestion is rejected if it
 * adds a skill the resume never mentions, adds a number that is not in the resume,
 * or does not correspond to any line of the resume.
 */
export function validateSuggestions(
  suggestions: BulletSuggestion[],
  resumeText: string,
  resumeSkills: string[] = [],
): ValidationResult {
  const known = skillSet([...extractSkills(resumeText), ...resumeSkills]);
  const resumeFigures = new Set(figures(resumeText));
  const accepted: BulletSuggestion[] = [];
  const rejected: RejectedSuggestion[] = [];

  for (const s of suggestions) {
    const reject = (why: string) => rejected.push({ suggestion: s, why });
    if (!s.suggestion.trim() || !s.original.trim()) { reject('Empty suggestion.'); continue; }
    if (s.suggestion.trim().toLowerCase() === s.original.trim().toLowerCase()) { reject('Same as the original.'); continue; }

    const invented = extractSkills(s.suggestion).filter((k) => !known.has(k.toLowerCase()));
    if (invented.length) {
      reject(`Adds ${invented.join(', ')}, which your resume does not mention.`);
      continue;
    }
    const newFigures = figures(s.suggestion).filter((f) => !resumeFigures.has(f));
    if (newFigures.length) {
      reject(`Adds the figure ${newFigures.join(', ')}, which is not in your resume.`);
      continue;
    }
    const source = findSourceLine(s.original, resumeText);
    if (!source) {
      reject('Rewrites a line that is not in your resume.');
      continue;
    }
    accepted.push({ ...s, original: source });
  }
  return { accepted, rejected };
}
