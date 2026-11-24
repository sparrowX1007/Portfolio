import { Code2, Database, GitBranch, Kanban, Network, RefreshCw, Server, ShieldCheck, Workflow } from 'lucide-react';
import { createElement } from 'react';
import SiDjango from '@icons-pack/react-simple-icons/icons/SiDjango.mjs';
import SiExpress from '@icons-pack/react-simple-icons/icons/SiExpress.mjs';
import SiFastapi from '@icons-pack/react-simple-icons/icons/SiFastapi.mjs';
import SiFlutter from '@icons-pack/react-simple-icons/icons/SiFlutter.mjs';
import SiGit from '@icons-pack/react-simple-icons/icons/SiGit.mjs';
import SiGithub from '@icons-pack/react-simple-icons/icons/SiGithub.mjs';
import SiJavascript from '@icons-pack/react-simple-icons/icons/SiJavascript.mjs';
import SiMongodb from '@icons-pack/react-simple-icons/icons/SiMongodb.mjs';
import SiMysql from '@icons-pack/react-simple-icons/icons/SiMysql.mjs';
import SiNestjs from '@icons-pack/react-simple-icons/icons/SiNestjs.mjs';
import SiNextdotjs from '@icons-pack/react-simple-icons/icons/SiNextdotjs.mjs';
import SiNodedotjs from '@icons-pack/react-simple-icons/icons/SiNodedotjs.mjs';
import SiPostgresql from '@icons-pack/react-simple-icons/icons/SiPostgresql.mjs';
import SiPython from '@icons-pack/react-simple-icons/icons/SiPython.mjs';
import SiReact from '@icons-pack/react-simple-icons/icons/SiReact.mjs';
import SiSpringboot from '@icons-pack/react-simple-icons/icons/SiSpringboot.mjs';
import SiTailwindcss from '@icons-pack/react-simple-icons/icons/SiTailwindcss.mjs';
import SiTypescript from '@icons-pack/react-simple-icons/icons/SiTypescript.mjs';

const iconDefinitions = {
  javascript: { label: 'JavaScript', Component: SiJavascript },
  typescript: { label: 'TypeScript', Component: SiTypescript },
  python: { label: 'Python', Component: SiPython },
  java: { label: 'Java · code', Component: Code2 },
  mongodb: { label: 'MongoDB', Component: SiMongodb },
  mysql: { label: 'MySQL', Component: SiMysql },
  postgresql: { label: 'PostgreSQL', Component: SiPostgresql },
  react: { label: 'React', Component: SiReact },
  flutter: { label: 'Flutter', Component: SiFlutter },
  nestjs: { label: 'NestJS', Component: SiNestjs },
  nextjs: { label: 'Next.js', Component: SiNextdotjs },
  django: { label: 'Django', Component: SiDjango },
  springboot: { label: 'Spring Boot', Component: SiSpringboot },
  tailwindcss: { label: 'Tailwind CSS', Component: SiTailwindcss },
  fastapi: { label: 'FastAPI', Component: SiFastapi },
  nodejs: { label: 'Node.js', Component: SiNodedotjs },
  express: { label: 'Express', Component: SiExpress },
  git: { label: 'Git', Component: SiGit },
  github: { label: 'GitHub', Component: SiGithub },
  uml: { label: 'UML · diagramme', Component: Workflow },
  merise: { label: 'MERISE · données', Component: Database },
  agile: { label: 'Agile / Scrum · méthode', Component: Kanban },
  cybersecurity: { label: 'Cybersécurité', Component: ShieldCheck },
  network: { label: 'Réseaux', Component: Network },
  gitflow: { label: 'Gestion de versions', Component: GitBranch },
  database: { label: 'Base de données', Component: Database },
  backend: { label: 'Backend', Component: Server },
  workflow: { label: 'Workflow', Component: RefreshCw },
  code: { label: 'Code', Component: Code2 },
};

const aliases = {
  js: 'javascript', javascript: 'javascript',
  ts: 'typescript', typescript: 'typescript',
  py: 'python', python: 'python',
  java: 'java',
  mongodb: 'mongodb', mongo: 'mongodb',
  mysql: 'mysql',
  postgres: 'postgresql', postgresql: 'postgresql', sql: 'database',
  react: 'react', reactjs: 'react', reactnative: 'react',
  flutter: 'flutter', nestjs: 'nestjs', nextjs: 'nextjs',
  django: 'django', spring: 'springboot', springboot: 'springboot',
  tailwind: 'tailwindcss', tailwindcss: 'tailwindcss',
  fastapi: 'fastapi', node: 'nodejs', nodejs: 'nodejs', express: 'express',
  git: 'git', github: 'github', gitgithub: 'github',
  uml: 'uml', unifiedmodelinglanguage: 'uml',
  merise: 'merise',
  agile: 'agile', scrum: 'agile', agilescrum: 'agile', scrumagile: 'agile',
  cybersecurity: 'cybersecurity', infosec: 'cybersecurity', securiteinformatique: 'cybersecurity',
  network: 'network', networks: 'network', reseaux: 'network', administrationreseaux: 'network',
  gitflow: 'gitflow', versioncontrol: 'gitflow',
};

const normalize = (value = '') => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export const skillIconOptions = Object.entries(iconDefinitions)
  .map(([id, definition]) => ({ id, label: definition.label }));

export function suggestSkillIcon(name = '', category = '') {
  const normalizedName = normalize(name);
  if (aliases[normalizedName]) return aliases[normalizedName];
  if (/\b(uml|merise)\b/i.test(name)) return 'uml';

  const normalizedCategory = normalize(category);
  if (/(cyber|securite|security)/.test(normalizedName + normalizedCategory)) return 'cybersecurity';
  if (/(network|reseau)/.test(normalizedName + normalizedCategory)) return 'network';
  if (/(database|databases|data|base|donnees)/.test(normalizedCategory)) return 'database';
  if (/(method|methodologie|agile|scrum)/.test(normalizedName + normalizedCategory)) return 'agile';
  if (/(tool|outil)/.test(normalizedCategory)) return 'gitflow';
  if (/(framework|library|bibliotheque)/.test(normalizedCategory)) return 'code';
  return 'code';
}

export function getSkillIconDefinition(iconId) {
  return iconDefinitions[iconId] || iconDefinitions.code;
}

export function SkillIcon({ icon, name, category, size = 16, className = '' }) {
  const definition = getSkillIconDefinition(icon || suggestSkillIcon(name, category));
  const IconComponent = definition.Component;
  return createElement(IconComponent, { size, className, 'aria-hidden': true, focusable: false });
}
