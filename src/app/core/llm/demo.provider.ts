import { GapAnalysis, GapInput, LetterInput } from '../prompts';
import { allBullets } from '../resume/parse';
import { extractSkills, scanSkills } from '../skills/extract';
import { JdSkill, scoreBand } from '../skills/match';
import { BulletSuggestion } from '../skills/validate';
import { LlmProvider, LlmRequest } from './llm-provider';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

// Weak openers and an honest, stronger verb with the same meaning.
const OPENERS: [RegExp, string][] = [
  [/^worked on\s+/i, 'Delivered '],
  [/^was responsible for\s+/i, 'Owned '],
  [/^responsible for\s+/i, 'Owned '],
  [/^was involved in\s+/i, 'Contributed to '],
  [/^participated in\s+/i, 'Contributed to '],
  [/^did\s+/i, 'Delivered '],
  [/^made\s+/i, 'Built '],
];

const TOOL_START = /\s+(?:with|using)\s+/i;
// The tool list ends at " for ...", ", raising ..." style clauses, or the end of the sentence.
const TOOL_END = /\s+for\b|,\s+\w+ing\b|[.;]\s*$|$/i;
const FILLER = /^(and|or|a|an|the|,|\s)*$/i;

/** Finds a trailing "with A, B and C" clause: its position, full length and the tool list. */
function toolTail(text: string): { index: number; length: number; tools: string } | null {
  const start = text.match(TOOL_START);
  if (!start || start.index === undefined) return null;
  const after = text.slice(start.index + start[0].length);
  const end = after.match(TOOL_END);
  const tools = after.slice(0, end?.index ?? after.length).trim();
  return tools ? { index: start.index, length: start[0].length + tools.length, tools } : null;
}

/**
 * Rephrases a bullet without adding anything: upgrades a weak opener, and moves a
 * trailing "with X, Y and Z" to the front so the skills a recruiter scans for come first.
 */
export function rephraseBullet(bullet: string): string {
  let out = bullet.trim();
  for (const [re, verb] of OPENERS) {
    if (re.test(out)) { out = out.replace(re, verb); break; }
  }
  const tail = toolTail(out);
  if (tail && tail.index > 15) {
    const { tools } = tail;
    let rest = tools;
    for (const occ of [...scanSkills(tools)].reverse()) rest = rest.slice(0, occ.index) + rest.slice(occ.index + occ.length);
    if (scanSkills(tools).length && FILLER.test(rest)) {
      const body = out.slice(0, tail.index) + out.slice(tail.index + tail.length);
      out = `Using ${tools}, ${body.charAt(0).toLowerCase()}${body.slice(1)}`;
    }
  }
  return out === bullet.trim() ? '' : out;
}

/** Bullets that show the most (and most important) matched skills. */
function relevantBullets(bullets: string[], matched: JdSkill[]): { bullet: string; skills: string[] }[] {
  const weights = new Map(matched.map((s) => [s.name, s.weight]));
  return bullets
    .map((bullet) => {
      const skills = extractSkills(bullet).filter((s) => weights.has(s));
      return { bullet, skills, weight: skills.reduce((sum, s) => sum + weights.get(s)!, 0) };
    })
    .filter((b) => b.skills.length)
    .sort((a, b) => b.weight - a.weight);
}

export function demoGapAnalysis({ profile, match }: GapInput): GapAnalysis {
  const band = scoreBand(match.score);
  const top = match.missing[0];
  const summary = [
    band === 'good' ? `Strong fit: your resume covers ${match.matched.length} of the ${match.jdSkills.length} skills this job asks for.`
      : band === 'ok' ? `Reasonable fit: you cover ${match.matched.length} of ${match.jdSkills.length} skills, but some important ones are missing.`
      : `Stretch role: only ${match.matched.length} of ${match.jdSkills.length} skills from the posting appear in your resume.`,
    top ? `The biggest gap is ${top.name}${top.importance === 'required' ? ', which is listed as required' : ''}.` : 'No skill gaps found.',
  ].join(' ');

  const gaps = match.missing.slice(0, 5).map((s) => {
    const related = match.matched.find((m) => m.category === s.category);
    const advice = s.importance === 'preferred'
      ? `Nice to have, not a blocker. If you have touched ${s.name}, add one line about it; otherwise skip it.`
      : related
        ? `If you have used ${s.name}, add it with a concrete example. If not, lead with your ${related.name} experience and say honestly that ${s.name} is something you are ready to learn.`
        : `${s.importance === 'required' ? 'Listed as required. ' : ''}Add it only if you have real experience; otherwise prepare to talk about how you would ramp up on ${s.name}.`;
    return { skill: s.name, advice };
  });

  const suggestions: BulletSuggestion[] = [];
  for (const { bullet, skills } of relevantBullets(allBullets(profile), match.matched)) {
    const suggestion = rephraseBullet(bullet);
    if (suggestion) {
      const reason = suggestion.startsWith('Using ')
        ? `Puts ${list(skills)} up front, where recruiters and ATS scans look first.`
        : `Stronger opening verb; keeps ${list(skills)}, which the job asks for.`;
      suggestions.push({ original: bullet, suggestion, reason });
    }
    if (suggestions.length >= 4) break;
  }
  return { summary, gaps, suggestions };
}

const GREETING = { formal: (c: string) => `Dear ${c} hiring team,`, friendly: (c: string) => `Hi ${c} team,`, concise: (c: string) => `Hello ${c} team,` };

/** Template letter filled from the resume and the matched skills. Uses only resume facts. */
export function demoCoverLetter({ profile, company, role, tone, match }: LetterInput): string {
  const co = company.trim() || 'your';
  const job = role.trim() || 'open';
  const skills = match.matched.slice(0, 4).map((s) => s.name);
  const lastJob = profile.experience[0];
  const evidence = relevantBullets(allBullets(profile), match.matched).slice(0, tone === 'concise' ? 1 : 2).map((b) => b.bullet.replace(/\.$/, ''));
  const name = profile.name || 'Your name';
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const who = profile.headline ? lower(profile.headline) : 'developer';
  const years = profile.summary.match(/(\d+)\+?\s+years/)?.[1];

  const opening = tone === 'friendly'
    ? `I was excited to see the ${job} role at ${company || 'your company'}. I'm a ${who}${years ? ` with ${years} years of experience` : ''}, and this posting reads like a description of the work I enjoy most.`
    : tone === 'concise'
      ? `I'm applying for the ${job} role. I'm a ${who}${skills.length ? ` working with ${list(skills.slice(0, 3))}` : ''}.`
      : `I am writing to apply for the ${job} position at ${company || 'your company'}. As a ${who}${years ? ` with ${years} years of experience` : ''}, I believe my background is a close match for what your team needs.`;

  const proof = evidence.length
    ? `${lastJob ? `At ${lastJob.company || 'my current role'}, ` : ''}I ${evidence.map(lower).join(', and ')}.`
    : '';
  const fit = skills.length
    ? tone === 'concise'
      ? `Your posting asks for ${list(skills)}; that is my day-to-day work.`
      : `Your posting asks for ${list(skills)}, which is the core of my day-to-day work${match.matched.length > skills.length ? `, along with ${list(match.matched.slice(4, 6).map((s) => s.name))}` : ''}.`
    : '';
  const learning = tone !== 'concise' && match.missing[0] && match.missing[0].importance !== 'preferred'
    ? `I have not used ${match.missing[0].name} in production yet, and I would be glad to ramp up on it quickly.`
    : '';
  const closing = tone === 'friendly'
    ? `I'd love to chat about how I could help ${co === 'your' ? 'your team' : co}. Thanks for reading!`
    : tone === 'concise'
      ? 'I would welcome a short call. Thank you for your time.'
      : `Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to ${co === 'your' ? 'your team' : co}.`;
  const signoff = tone === 'friendly' ? 'Best,' : tone === 'concise' ? 'Regards,' : 'Sincerely,';

  return [GREETING[tone](company.trim() || 'Hiring'), opening, [proof, fit].filter(Boolean).join(' '), learning, closing, `${signoff}\n${name}`]
    .filter(Boolean).join('\n\n');
}

export class DemoProvider implements LlmProvider {
  constructor(private readonly delayMs = 500) {}

  async complete(req: LlmRequest): Promise<string> {
    await sleep(this.delayMs);
    if (req.task === 'gap-analysis') return JSON.stringify(demoGapAnalysis(req.input as GapInput));
    if (req.task === 'ping') return '{"ok":true}';
    let text = '';
    for await (const chunk of this.stream(req)) text += chunk;
    return text;
  }

  async *stream(req: LlmRequest, signal?: AbortSignal): AsyncIterable<string> {
    const text = req.task === 'cover-letter' ? demoCoverLetter(req.input as LetterInput) : '';
    for (const piece of text.match(/\S+\s*/g) ?? []) {
      if (signal?.aborted) return;
      await sleep(this.delayMs / 25);
      yield piece;
    }
  }
}
