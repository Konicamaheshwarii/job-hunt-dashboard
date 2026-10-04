export type SkillCategory = 'language' | 'frontend' | 'backend' | 'data' | 'cloud' | 'testing' | 'ai' | 'practice' | 'soft';

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: 'Languages',
  frontend: 'Frontend',
  backend: 'Backend',
  data: 'Data',
  cloud: 'Cloud & DevOps',
  testing: 'Testing',
  ai: 'AI & ML',
  practice: 'Practices',
  soft: 'Soft skills',
};

export interface SkillDef {
  /** Canonical display name. */
  name: string;
  category: SkillCategory;
  /** Case-insensitive spellings (the name is always included). */
  aliases?: string[];
  /** Case-sensitive spellings for words that are also ordinary English ("REST", "Swift"). */
  exact?: string[];
  /** If true, the name itself is matched case-sensitively only. */
  exactName?: boolean;
}

/**
 * Skills the matcher knows, with synonyms. Longer phrases win over shorter ones
 * ("React Native" is not also counted as "React").
 */
export const SKILLS: SkillDef[] = [
  // languages
  { name: 'TypeScript', category: 'language', aliases: ['ts', 'typescript 5'] },
  { name: 'JavaScript', category: 'language', aliases: ['js', 'es6', 'es2015', 'ecmascript', 'vanilla js'] },
  { name: 'Python', category: 'language', aliases: ['python3', 'python 3'] },
  { name: 'Java', category: 'language', aliases: ['java 17', 'java 21'] },
  { name: 'Kotlin', category: 'language' },
  { name: 'C#', category: 'language', aliases: ['csharp', 'c sharp'] },
  { name: 'C++', category: 'language', aliases: ['cpp'] },
  { name: 'Go', category: 'language', aliases: ['golang'], exact: ['Go'], exactName: true },
  { name: 'Rust', category: 'language', exactName: true, exact: ['Rust'] },
  { name: 'Ruby', category: 'language' },
  { name: 'PHP', category: 'language' },
  { name: 'Swift', category: 'language', exactName: true, exact: ['Swift'] },
  { name: 'SQL', category: 'data', aliases: ['t-sql', 'pl/sql'] },
  { name: 'HTML', category: 'frontend', aliases: ['html5', 'semantic html'] },
  { name: 'CSS', category: 'frontend', aliases: ['css3'] },
  { name: 'Sass', category: 'frontend', aliases: ['scss'] },

  // frontend
  { name: 'Angular', category: 'frontend', aliases: ['angular 2+', 'angular2', 'angular 17', 'angular 18', 'angular 19', 'angular 20'] },
  { name: 'AngularJS', category: 'frontend', aliases: ['angular.js', 'angular 1'] },
  { name: 'React', category: 'frontend', aliases: ['react.js', 'reactjs'] },
  { name: 'React Native', category: 'frontend' },
  { name: 'Next.js', category: 'frontend', aliases: ['nextjs', 'next js'] },
  { name: 'Vue', category: 'frontend', aliases: ['vue.js', 'vuejs', 'vue 3', 'nuxt'] },
  { name: 'Svelte', category: 'frontend', aliases: ['sveltekit'] },
  { name: 'RxJS', category: 'frontend', aliases: ['reactive extensions', 'observables'] },
  { name: 'Signals', category: 'frontend', aliases: ['angular signals'] },
  { name: 'NgRx', category: 'frontend', aliases: ['ngrx store', 'ngxs'] },
  { name: 'Redux', category: 'frontend', aliases: ['redux toolkit', 'zustand'] },
  { name: 'State management', category: 'frontend' },
  { name: 'Tailwind CSS', category: 'frontend', aliases: ['tailwind', 'tailwindcss'] },
  { name: 'Angular Material', category: 'frontend', aliases: ['material ui', 'mui', 'angular cdk'] },
  { name: 'Design systems', category: 'frontend', aliases: ['design system', 'component library', 'storybook'] },
  { name: 'Micro-frontends', category: 'frontend', aliases: ['micro frontends', 'microfrontends', 'module federation', 'micro-frontend'] },
  { name: 'Nx', category: 'frontend', aliases: ['nx monorepo', 'monorepo', 'monorepos'] },
  { name: 'Webpack', category: 'frontend', aliases: ['vite', 'esbuild', 'rollup'] },
  { name: 'Accessibility', category: 'frontend', aliases: ['a11y', 'wcag', 'aria', 'wai-aria'] },
  { name: 'Web performance', category: 'frontend', aliases: ['core web vitals', 'lighthouse', 'performance optimization', 'performance optimisation', 'page speed'] },
  { name: 'Responsive design', category: 'frontend', aliases: ['responsive', 'mobile-first', 'mobile first'] },
  { name: 'SSR', category: 'frontend', aliases: ['server-side rendering', 'server side rendering', 'angular universal', 'hydration'] },
  { name: 'PWA', category: 'frontend', aliases: ['progressive web app', 'progressive web apps', 'service worker', 'service workers'] },
  { name: 'D3.js', category: 'frontend', aliases: ['d3', 'data visualization', 'data visualisation', 'charts'] },
  { name: 'i18n', category: 'frontend', aliases: ['internationalization', 'internationalisation', 'localization', 'localisation'] },
  { name: 'Ionic', category: 'frontend', aliases: ['capacitor'] },
  { name: 'Flutter', category: 'frontend', aliases: ['dart'] },

  // backend
  { name: 'Node.js', category: 'backend', aliases: ['node', 'nodejs', 'node js'] },
  { name: 'Express', category: 'backend', aliases: ['express.js', 'expressjs'], exactName: true, exact: ['Express'] },
  { name: 'NestJS', category: 'backend', aliases: ['nest.js', 'nest js'] },
  { name: 'REST APIs', category: 'backend', aliases: ['rest api', 'restful', 'restful apis', 'rest apis', 'restful api'], exact: ['REST'] },
  { name: 'GraphQL', category: 'backend', aliases: ['apollo'] },
  { name: 'WebSockets', category: 'backend', aliases: ['websocket', 'socket.io', 'real-time', 'realtime'] },
  { name: 'gRPC', category: 'backend' },
  { name: 'Microservices', category: 'backend', aliases: ['microservice', 'micro-services', 'service-oriented'] },
  { name: 'Spring Boot', category: 'backend', aliases: ['spring framework'], exact: ['Spring'] },
  { name: '.NET', category: 'backend', aliases: ['dotnet', 'asp.net', '.net core'] },
  { name: 'Django', category: 'backend' },
  { name: 'FastAPI', category: 'backend', aliases: ['fast api'] },
  { name: 'Flask', category: 'backend' },
  { name: 'Ruby on Rails', category: 'backend', aliases: ['rails'] },
  { name: 'Authentication', category: 'backend', aliases: ['oauth', 'oauth2', 'oidc', 'openid connect', 'jwt', 'sso', 'auth0'] },
  { name: 'Security', category: 'backend', aliases: ['owasp', 'xss', 'csrf', 'web security', 'secure coding'] },

  // data
  { name: 'PostgreSQL', category: 'data', aliases: ['postgres', 'psql'] },
  { name: 'MySQL', category: 'data', aliases: ['mariadb'] },
  { name: 'MongoDB', category: 'data', aliases: ['mongo', 'mongoose'] },
  { name: 'Redis', category: 'data' },
  { name: 'Elasticsearch', category: 'data', aliases: ['elastic search', 'opensearch'] },
  { name: 'Kafka', category: 'data', aliases: ['apache kafka', 'event streaming'] },
  { name: 'Firebase', category: 'data', aliases: ['firestore'] },
  { name: 'Data analysis', category: 'data', aliases: ['analytics', 'pandas', 'data analytics'] },

  // cloud & devops
  { name: 'AWS', category: 'cloud', aliases: ['amazon web services', 'lambda', 'aws lambda', 's3', 'cloudfront', 'ec2'] },
  { name: 'Azure', category: 'cloud', aliases: ['microsoft azure', 'azure devops'] },
  { name: 'GCP', category: 'cloud', aliases: ['google cloud', 'google cloud platform', 'cloud run'] },
  { name: 'Docker', category: 'cloud', aliases: ['containers', 'containerization', 'containerisation'] },
  { name: 'Kubernetes', category: 'cloud', aliases: ['k8s', 'helm'] },
  { name: 'Terraform', category: 'cloud', aliases: ['infrastructure as code', 'iac'] },
  { name: 'CI/CD', category: 'cloud', aliases: ['ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment', 'github actions', 'gitlab ci', 'jenkins'] },
  { name: 'Git', category: 'cloud', aliases: ['github', 'gitlab', 'bitbucket', 'version control'] },
  { name: 'Linux', category: 'cloud', aliases: ['bash', 'shell scripting'] },
  { name: 'Observability', category: 'cloud', aliases: ['monitoring', 'sentry', 'datadog', 'opentelemetry', 'logging', 'grafana'] },

  // testing
  { name: 'Unit testing', category: 'testing', aliases: ['unit tests', 'unit test', 'jasmine', 'karma', 'vitest', 'tdd', 'test-driven development', 'test driven development'] },
  { name: 'Jest', category: 'testing' },
  { name: 'E2E testing', category: 'testing', aliases: ['end-to-end testing', 'end to end testing', 'e2e tests', 'e2e', 'cypress', 'playwright', 'selenium', 'protractor'] },
  { name: 'Testing Library', category: 'testing', aliases: ['react testing library', 'angular testing library'] },

  // ai
  { name: 'LLMs', category: 'ai', aliases: ['llm', 'large language models', 'large language model', 'generative ai', 'genai', 'gpt', 'openai', 'gemini', 'claude'] },
  { name: 'Prompt engineering', category: 'ai', aliases: ['prompting', 'prompt design'] },
  { name: 'RAG', category: 'ai', aliases: ['retrieval augmented generation', 'retrieval-augmented generation', 'vector search', 'embeddings', 'vector database'] },
  { name: 'Machine learning', category: 'ai', aliases: ['ml', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn'] },
  { name: 'LangChain', category: 'ai', aliases: ['langgraph', 'llamaindex'] },

  // practices
  { name: 'Agile', category: 'practice', aliases: ['scrum', 'kanban', 'sprints', 'sprint planning'] },
  { name: 'Code review', category: 'practice', aliases: ['code reviews', 'pull requests', 'peer review'] },
  { name: 'System design', category: 'practice', aliases: ['software architecture', 'frontend architecture', 'architecture', 'architectural'] },
  { name: 'Clean code', category: 'practice', aliases: ['design patterns', 'refactoring'], exact: ['SOLID'] },
  { name: 'Figma', category: 'practice', aliases: ['ui/ux', 'ux design', 'prototyping'] },
  { name: 'Jira', category: 'practice', aliases: ['confluence'] },

  // soft skills
  { name: 'Mentoring', category: 'soft', aliases: ['mentor', 'mentored', 'mentorship', 'coaching', 'coached'] },
  { name: 'Leadership', category: 'soft', aliases: ['tech lead', 'team lead', 'led a team', 'lead developer', 'technical leadership'] },
  { name: 'Communication', category: 'soft', aliases: ['communicator', 'stakeholder management', 'stakeholders', 'cross-functional'] },
  { name: 'Problem solving', category: 'soft', aliases: ['problem-solving', 'troubleshooting', 'debugging'] },
  { name: 'Ownership', category: 'soft', aliases: ['end-to-end ownership', 'take ownership', 'owned'] },
];

const BY_NAME = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s]));

export function skillDef(name: string): SkillDef | undefined {
  return BY_NAME.get(name.toLowerCase());
}
