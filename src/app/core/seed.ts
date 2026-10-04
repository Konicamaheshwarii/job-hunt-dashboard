import { Application, Interview, Status, WorkMode, ymd } from './models';

/** A fictional resume used in demo mode and as the starting profile. */
export const DEMO_RESUME = `Jordan Avery
Senior Frontend Engineer
jordan.avery@example.com | +1 555 010 2233 | Austin, TX | github.com/jordan-avery

SUMMARY
Frontend engineer with 8 years of experience building fast, accessible web apps in Angular and TypeScript. I care about clean architecture, measurable performance and helping teams ship with confidence.

SKILLS
Languages: TypeScript, JavaScript, HTML, CSS, SCSS, SQL
Frameworks: Angular, RxJS, NgRx, Angular Material, Node.js, Express
Practices: Unit testing (Jasmine, Jest), Cypress, CI/CD with GitHub Actions, Accessibility (WCAG 2.1), Agile
Tools: Git, Docker, Figma, Jira, AWS (S3, CloudFront)

EXPERIENCE
Senior Frontend Engineer | Brightwave Analytics | 2021 - Present
- Led the migration of a 120-screen Angular dashboard to standalone components and signals, cutting initial bundle size by 38%.
- Built a shared design system with Angular Material and Storybook used by 4 product teams.
- Introduced OnPush change detection and virtual scrolling, bringing table render time from 1.8s to 300ms.
- Mentored 3 junior developers through weekly pairing sessions and code reviews.
- Set up CI/CD pipelines in GitHub Actions with unit tests, Cypress e2e tests and Lighthouse budgets.

Frontend Developer | Northgate Logistics | 2018 - 2021
- Developed a real-time shipment tracking app with Angular, RxJS and WebSockets for 2,000 daily users.
- Worked on REST API integration with a Node.js and Express backend.
- Improved accessibility to WCAG 2.1 AA, fixing 140 audit issues.
- Wrote unit tests with Jasmine and Karma, raising coverage from 35% to 80%.

Junior Web Developer | Pixel & Pine Studio | 2016 - 2018
- Built responsive marketing sites with HTML, SCSS and JavaScript for 20+ clients.
- Helped the team move from FTP deployments to Git-based workflows.

EDUCATION
B.Sc. Computer Science, University of Texas at Austin, 2016
`;

export const DEMO_JD = `Senior Angular Engineer - Lumenfield Health (Remote, US)

About the role
You will own the patient scheduling web app used by 400 clinics.

What you'll do
- Build features end to end in Angular and TypeScript
- Improve web performance and accessibility across the product
- Review pull requests and mentor other engineers

Requirements
- 5+ years with Angular, RxJS and TypeScript
- Strong experience with state management (NgRx or Signals)
- Unit testing and E2E testing (Cypress or Playwright)
- Experience consuming REST APIs and GraphQL

Nice to have
- Experience with Nx monorepos and micro-frontends
- AWS or GCP, Docker
- Familiarity with LLMs and prompt engineering
`;

type Step = [Status, number];

interface SeedRow {
  company: string;
  role: string;
  location: string;
  mode: WorkMode;
  salary?: [number, number];
  source: string;
  steps: Step[];
  interviews?: [number, number, string][];
  contact?: [string, string];
  next?: [string, number];
  notes?: string;
  followedUp?: number;
}

// Day offsets are relative to today (negative = in the past). All companies are fictional.
const ROWS: SeedRow[] = [
  { company: 'Lumenfield Health', role: 'Senior Angular Engineer', location: 'Remote, US', mode: 'remote', salary: [150000, 175000], source: 'Referral',
    steps: [['wishlist', -30], ['applied', -27], ['screening', -22], ['interview', -15]], interviews: [[-10, 14, 'Technical'], [3, 15, 'System design'], [6, 11, 'Team fit']],
    contact: ['Maya Ortiz', 'Engineering Manager'], next: ['Prepare system design examples', 2], notes: 'Referral from a former teammate. Scheduling product, Angular 19 + NgRx.' },
  { company: 'Quillstone', role: 'Frontend Engineer II', location: 'Denver, CO', mode: 'hybrid', salary: [125000, 140000], source: 'LinkedIn',
    steps: [['applied', -40], ['screening', -33], ['interview', -24], ['offer', -4]], interviews: [[-20, 10, 'Technical'], [-13, 13, 'Onsite loop']],
    contact: ['Dev Patel', 'Recruiter'], next: ['Reply to offer', 3], notes: 'Offer: base 138k, 10% bonus. Ask about remote days.' },
  { company: 'Harborline Freight', role: 'Senior Frontend Developer', location: 'Remote', mode: 'remote', salary: [140000, 160000], source: 'Company site',
    steps: [['applied', -35], ['screening', -28], ['interview', -20]], interviews: [[-14, 16, 'Technical'], [1, 10, 'Final round']],
    contact: ['Sana Reyes', 'Head of Frontend'], next: ['Review their public design system', 0] },
  { company: 'Orbitly', role: 'Angular Developer', location: 'Austin, TX', mode: 'onsite', salary: [115000, 130000], source: 'Indeed',
    steps: [['applied', -16], ['screening', -12], ['interview', -6]], interviews: [[4, 9, 'Pair programming']],
    contact: ['Liam Chen', 'Tech Lead'], next: ['Practice live coding in StackBlitz', 3] },
  { company: 'Fernway Learning', role: 'Senior UI Engineer', location: 'Remote, US', mode: 'remote', salary: [135000, 155000], source: 'Wellfound',
    steps: [['applied', -24], ['screening', -19], ['interview', -12]], interviews: [[-8, 15, 'Technical'], [8, 14, 'Product walkthrough']], contact: ['Ava Brooks', 'Recruiter'] },
  { company: 'Cobaltix', role: 'Frontend Platform Engineer', location: 'Seattle, WA', mode: 'hybrid', salary: [160000, 185000], source: 'Recruiter',
    steps: [['applied', -21], ['screening', -14]], interviews: [[2, 12, 'Recruiter screen']], contact: ['Noah Kim', 'Agency recruiter'], next: ['Send updated resume', 1] },
  { company: 'Verdant Bank', role: 'Senior Software Engineer, Web', location: 'Charlotte, NC', mode: 'hybrid', salary: [145000, 165000], source: 'LinkedIn',
    steps: [['applied', -12], ['screening', -9]], interviews: [[5, 10, 'Hiring manager']] },
  { company: 'Tidepool Media', role: 'Angular Consultant', location: 'Remote', mode: 'remote', source: 'Recruiter',
    steps: [['applied', -10], ['screening', -6]], next: ['Confirm contract rate', 2] },
  { company: 'Pinecrest Labs', role: 'Senior Frontend Engineer', location: 'Remote, US', mode: 'remote', salary: [150000, 170000], source: 'Company site',
    steps: [['applied', -9]] },
  { company: 'Northwind Robotics', role: 'Frontend Engineer', location: 'Boston, MA', mode: 'hybrid', salary: [120000, 140000], source: 'LinkedIn',
    steps: [['applied', -11]] },
  { company: 'Saltmarsh Games', role: 'UI Engineer (Angular)', location: 'Remote', mode: 'remote', source: 'Wellfound',
    steps: [['applied', -8]] },
  { company: 'Brightloom', role: 'Staff Frontend Engineer', location: 'San Francisco, CA', mode: 'hybrid', salary: [190000, 220000], source: 'Referral',
    steps: [['applied', -5]], contact: ['Priya Shah', 'Senior Engineer'] },
  { company: 'Kestrel Insurance', role: 'Senior Angular Developer', location: 'Remote, US', mode: 'remote', salary: [130000, 150000], source: 'Indeed',
    steps: [['applied', -3]] },
  { company: 'Amberleaf', role: 'Frontend Engineer', location: 'Remote', mode: 'remote', salary: [110000, 125000], source: 'LinkedIn',
    steps: [['applied', -2]] },
  { company: 'Gridstone Energy', role: 'Web Platform Engineer', location: 'Houston, TX', mode: 'onsite', salary: [125000, 145000], source: 'Company site',
    steps: [['applied', -1]] },
  { company: 'Meridian Travel', role: 'Senior Frontend Engineer', location: 'Remote, US', mode: 'remote', source: 'LinkedIn',
    steps: [['applied', -26]], followedUp: -18 },
  { company: 'Copperline', role: 'Angular Engineer', location: 'Chicago, IL', mode: 'hybrid', salary: [120000, 135000], source: 'Indeed',
    steps: [['applied', -29]] },
  { company: 'Silverpeak Software', role: 'Frontend Developer', location: 'Remote', mode: 'remote', source: 'Indeed',
    steps: [['applied', -33]] },
  { company: 'Lantern Civic', role: 'Senior Web Engineer', location: 'Remote, US', mode: 'remote', salary: [125000, 140000], source: 'Company site',
    steps: [['applied', -55], ['screening', -48]], notes: 'Recruiter said they would follow up after the hiring freeze.' },
  { company: 'Driftwood Commerce', role: 'Frontend Engineer', location: 'Remote', mode: 'remote', source: 'LinkedIn',
    steps: [['applied', -58], ['ghosted', -30]] },
  { company: 'Ironbark Systems', role: 'Angular Developer', location: 'Dallas, TX', mode: 'onsite', source: 'Indeed',
    steps: [['applied', -52], ['ghosted', -25]] },
  { company: 'Bluefin Data', role: 'Senior Frontend Engineer', location: 'Remote', mode: 'remote', source: 'LinkedIn',
    steps: [['applied', -47], ['ghosted', -20]] },
  { company: 'Hollow Creek Health', role: 'UI Developer', location: 'Remote, US', mode: 'remote', source: 'Indeed',
    steps: [['applied', -44], ['rejected', -37]] },
  { company: 'Vantage Point HR', role: 'Frontend Engineer', location: 'Remote', mode: 'remote', source: 'LinkedIn',
    steps: [['applied', -50], ['rejected', -45]] },
  { company: 'Starling Mobility', role: 'Senior Angular Engineer', location: 'Remote, US', mode: 'remote', salary: [140000, 160000], source: 'Company site',
    steps: [['applied', -46], ['screening', -40], ['rejected', -36]] },
  { company: 'Quarry & Co', role: 'Frontend Engineer', location: 'New York, NY', mode: 'hybrid', salary: [140000, 160000], source: 'Referral',
    steps: [['applied', -42], ['screening', -38], ['interview', -33], ['rejected', -25]], interviews: [[-30, 11, 'Technical']],
    notes: 'Feedback: strong Angular, wanted more GraphQL experience.' },
  { company: 'Ridgeview Telecom', role: 'Angular Developer', location: 'Remote', mode: 'remote', source: 'Indeed',
    steps: [['applied', -39], ['rejected', -31]] },
  { company: 'Mosaic Pay', role: 'Senior Frontend Engineer', location: 'Remote, US', mode: 'remote', salary: [155000, 180000], source: 'Wellfound',
    steps: [['applied', -37], ['screening', -31], ['interview', -26], ['rejected', -18]], interviews: [[-23, 15, 'Technical'], [-20, 10, 'System design']] },
  { company: 'Cinderblock Studio', role: 'UI Engineer', location: 'Portland, OR', mode: 'hybrid', source: 'LinkedIn',
    steps: [['applied', -31], ['rejected', -15]] },
  { company: 'Palisade Security', role: 'Frontend Engineer', location: 'Remote', mode: 'remote', source: 'Recruiter',
    steps: [['applied', -20], ['screening', -16], ['rejected', -10]] },
  { company: 'Wildflower Foods', role: 'Senior Frontend Developer', location: 'Remote', mode: 'remote', source: 'Company site',
    steps: [['wishlist', -6]], next: ['Tailor resume and apply', 1] },
  { company: 'Atlas Maps', role: 'Senior Angular Engineer', location: 'Remote, EU/US', mode: 'remote', salary: [150000, 170000], source: 'LinkedIn',
    steps: [['wishlist', -3]], next: ['Ask Priya for a referral', 2] },
  { company: 'Echo Valley Credit Union', role: 'Web Developer', location: 'Remote, US', mode: 'remote', source: 'Indeed',
    steps: [['wishlist', -18]] },
  { company: 'Nimbus Notes', role: 'Frontend Engineer (AI features)', location: 'Remote', mode: 'remote', salary: [145000, 165000], source: 'Wellfound',
    steps: [['wishlist', -1]] },
];

function at(now: Date, dayOffset: number, hour = 10): string {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Realistic demo pipeline spread over the last two months, relative to `now`. */
export function seedApplications(now = new Date()): Application[] {
  return ROWS.map((r, i): Application => {
    const history = r.steps.map(([status, day]) => ({ status, date: at(now, day, 9 + (i % 8)) }));
    const interviews: Interview[] = (r.interviews ?? []).map(([day, hour, kind], j) => ({
      id: `seed-${i}-iv${j}`, date: at(now, day, hour), kind, durationMin: kind === 'Onsite loop' ? 240 : kind === 'Recruiter screen' ? 30 : 60,
    }));
    const created = history[0].date;
    const updated = history[history.length - 1].date;
    return {
      id: `seed-${i}`,
      company: r.company,
      role: r.role,
      link: `https://careers.example.com/${slug(r.company)}/${slug(r.role)}`,
      location: r.location,
      workMode: r.mode,
      salaryMin: r.salary?.[0],
      salaryMax: r.salary?.[1],
      currency: 'USD',
      source: r.source,
      status: r.steps[r.steps.length - 1][0],
      history,
      contacts: r.contact ? [{ name: r.contact[0], role: r.contact[1], email: `${slug(r.contact[0]).replace('-', '.')}@example.com` }] : [],
      notes: r.notes ?? '',
      nextAction: r.next?.[0] ?? '',
      nextActionDate: r.next ? ymd(at(now, r.next[1])) : undefined,
      interviews,
      lastContacted: r.followedUp !== undefined ? at(now, r.followedUp) : undefined,
      jobDescription: i === 0 ? DEMO_JD : undefined,
      createdAt: created,
      updatedAt: updated,
    };
  });
}
