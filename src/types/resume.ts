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

export interface LegacyTextSnippet {
  id: string
  title: string
  content: string
  category?: LibraryCategory
  favorite?: boolean
  lastUsedAt?: string
  useCount?: number
  updatedAt: string
}

export interface PlainLibraryItem {
  id: string
  itemType: 'plain'
  category: LibraryCategory
  title: string
  content: string
  favorite: boolean
  lastUsedAt?: string
  useCount: number
}

export interface LibraryChildItem {
  id: string
  key: string
  label: string
  content: string
  lastUsedAt?: string
  useCount?: number
}

export interface GroupedLibraryItem {
  id: string
  itemType: 'group'
  category: GroupedLibraryCategory
  title: string
  subtitle?: string
  favorite: boolean
  lastUsedAt?: string
  useCount: number
  children: LibraryChildItem[]
}

export type LibraryItem = PlainLibraryItem | GroupedLibraryItem

export interface Resume {
  version: 2
  basic: BasicInfo
  education: Education[]
  projects: Project[]
  experience: Experience[]
  skills: Skills
  libraryItems: LibraryItem[]
  snippets?: LegacyTextSnippet[]
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

export type LibraryCategory =
  | 'project'
  | 'internship'
  | 'education'
  | 'award'
  | 'skill'
  | 'selfDescription'
  | 'commonAnswer'
  | 'other'

export type GroupedLibraryCategory = Extract<LibraryCategory, 'project' | 'education' | 'internship' | 'award'>

export type TextSnippet = LegacyTextSnippet
export type SnippetCategory = LibraryCategory
