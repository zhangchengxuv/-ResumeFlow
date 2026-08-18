import type { Resume, ResumeFieldPath } from '../types/resume'

const snippetTitleByPath: Partial<Record<ResumeFieldPath, string>> = {
  'snippets.selfEvaluation': '自我评价',
  'snippets.personalStrengths': '个人优势',
  'snippets.careerPlan': '职业规划',
  'snippets.projectIntro': '项目介绍',
}

export function getResumeValue(resume: Resume, path: ResumeFieldPath): string {
  if (path.startsWith('snippets.')) {
    const title = snippetTitleByPath[path]
    const item = resume.libraryItems.find((entry) =>
      entry.itemType === 'plain' && title && (entry.title === title || entry.title.startsWith(`${title} `)),
    )
    return item?.itemType === 'plain' ? item.content : ''
  }
  const [section, key] = path.split('.') as [keyof Pick<Resume, 'basic' | 'education' | 'projects' | 'experience' | 'skills'>, string]
  const value = resume[section]
  if (Array.isArray(value)) {
    const first = value[0] as unknown as Record<string, string>
    return first?.[key] ?? ''
  }
  return (value as unknown as Record<string, string>)[key] ?? ''
}
