import { Experience, Profile } from '../models';
import { canonicalSkill, extractSkills } from '../skills/extract';

type Section = 'header' | 'summary' | 'skills' | 'experience' | 'education' | 'other';

const HEADINGS: [Section, RegExp][] = [
  ['summary', /^(summary|profile|about( me)?|professional summary|objective)$/i],
  ['skills', /^((technical |core |key )?skills|technologies|tech stack|skills & tools|tools)$/i],
  ['experience', /^((work |professional |relevant )?experience|employment( history)?|work history)$/i],
  ['education', /^(education|certifications?|education & certifications)$/i],
  ['other', /^(projects|personal projects|languages|interests|awards|publications|volunteering)$/i],
];

const BULLET = /^\s*[-*•▪◦·‣]\s*/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /\+?\d[\d\s().-]{7,}\d/;
const URL = /(https?:\/\/|www\.|linkedin\.com|github\.com)/i;
const YEAR_RANGE = /((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}\s*(-|–|—|to)\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((19|20)\d{2}|present|current|now)/i;

function headingOf(line: string): Section | null {
  const t = line.trim().replace(/[:\s]+$/, '');
  if (!t || t.length > 40) return null;
  for (const [section, re] of HEADINGS) if (re.test(t)) return section;
  return null;
}

/** "Senior Engineer — Acme Corp | 2021 - Present" -> title, company, period. */
export function parseRoleLine(line: string): Pick<Experience, 'title' | 'company' | 'period'> {
  const period = line.match(YEAR_RANGE)?.[0] ?? '';
  const rest = line.replace(period, '').replace(/[|()[\],\s–—-]+$/, '').replace(/^[|,\s–—-]+/, '').trim();
  const parts = rest.split(/\s+(?:at|@)\s+|\s*[|–—]\s*|\s+-\s+|,\s+/).map((p) => p.trim()).filter(Boolean);
  return { title: parts[0] ?? '', company: parts.slice(1).join(', '), period: period.trim() };
}

function splitSkills(text: string): string[] {
  return text
    .split(/[,;|•·\n]|\s{2,}/)
    .map((s) => s.replace(/^[\w &/]+:\s*/, (m) => (m.length < 25 ? '' : m)).replace(BULLET, '').trim())
    .filter((s) => s.length > 0 && s.length < 40);
}

/** Turns plain resume text (pasted or extracted from a PDF) into a structured profile. */
export function parseResume(rawText: string): Profile {
  const text = rawText.replace(/\r/g, '');
  const lines = text.split('\n');
  const profile: Profile = {
    name: '', email: '', phone: '', location: '', headline: '', summary: '',
    skills: [], experience: [], education: [], rawText: text.trim(),
  };

  profile.email = text.match(EMAIL)?.[0] ?? '';
  profile.phone = (text.match(PHONE)?.[0] ?? '').trim();

  let section: Section = 'header';
  const summary: string[] = [];
  const skillsText: string[] = [];
  let current: Experience | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = headingOf(line);
    if (heading) { section = heading; current = undefined; continue; }

    switch (section) {
      case 'header': {
        const contact = line.split(/\s*[|·•]\s*/).filter(Boolean);
        if (!profile.name && !EMAIL.test(line) && !PHONE.test(line) && line.split(/\s+/).length <= 5) {
          profile.name = line;
        } else if (contact.some((p) => EMAIL.test(p) || PHONE.test(p) || URL.test(p))) {
          const place = contact.find((p) => !EMAIL.test(p) && !PHONE.test(p) && !URL.test(p) && /^[A-Za-z .'-]+(,\s*[A-Za-z .'-]+)+$/.test(p));
          if (place && !profile.location) profile.location = place.trim();
        } else if (!profile.headline) {
          profile.headline = line;
        } else {
          summary.push(line);
        }
        break;
      }
      case 'summary': summary.push(line); break;
      case 'skills': skillsText.push(line); break;
      case 'education': profile.education.push(line.replace(BULLET, '')); break;
      case 'experience': {
        if (BULLET.test(raw) || (current && line.length > 60 && !YEAR_RANGE.test(line))) {
          if (!current) { current = { title: '', company: '', period: '', bullets: [] }; profile.experience.push(current); }
          current.bullets.push(line.replace(BULLET, ''));
        } else if (current && !current.period && YEAR_RANGE.test(line) && line.length < 40) {
          current.period = line.match(YEAR_RANGE)![0];
        } else {
          current = { ...parseRoleLine(line), bullets: [] };
          profile.experience.push(current);
        }
        break;
      }
      default: break;
    }
  }

  profile.summary = summary.join(' ');
  const listed = splitSkills(skillsText.join('\n')).map(canonicalSkill);
  profile.skills = [...new Set([...listed, ...extractSkills(text)])].filter(Boolean);
  return profile;
}

/** All bullet points across roles, used by the matcher and the letter writer. */
export function allBullets(profile: Profile): string[] {
  return profile.experience.flatMap((e) => e.bullets);
}
