export interface BasicInfo {
  name: string
  englishName: string
  gender: string
  birthDate: string
  phone: string
  email: string
  city: string
  hometown: string
  targetCity: string
  targetRole: string
  github: string
  website: string
}

export interface Education {
  id: string
  school: string
  degree: string
  major: string
  startDate: string
  endDate: string
  gpa: string
  ranking: string
  research: string
  description: string
}

export interface Project {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  description: string
  responsibilities: string
  techStack: string
}

export interface Experience {
  id: string
  company: string
  department: string
  role: string
  startDate: string
  endDate: string
  description: string
}

export interface Skills {
  programming: string
  tools: string
  embedded: string
  robotics: string
  mechanical: string
  english: string
  other: string
}

export interface TextSnippet {
  id: string
  title: string
  content: string
  category?: SnippetCategory
  favorite?: boolean
  lastUsedAt?: string
  useCount?: number
  updatedAt: string
}

export interface Resume {
  version: 1
  basic: BasicInfo
  education: Education[]
  projects: Project[]
  experience: Experience[]
  skills: Skills
  snippets: TextSnippet[]
  updatedAt: string
}

export type ResumeFieldPath =
  | `basic.${keyof BasicInfo}`
  | `education.${Exclude<keyof Education, 'id'>}`
  | `projects.${Exclude<keyof Project, 'id'>}`
  | `experience.${Exclude<keyof Experience, 'id'>}`
  | `skills.${keyof Skills}`
  | 'snippets.selfEvaluation'
  | 'snippets.personalStrengths'
  | 'snippets.careerPlan'
  | 'snippets.projectIntro'

export type ResumeSection = 'basic' | 'education' | 'projects' | 'experience' | 'skills'

export type SnippetCategory =
  | 'project'
  | 'internship'
  | 'education'
  | 'award'
  | 'skill'
  | 'selfDescription'
  | 'commonAnswer'
  | 'other'
