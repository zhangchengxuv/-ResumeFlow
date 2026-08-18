import type { ActiveFieldDescriptor } from '../types/fields'
import type { SnippetCategory, TextSnippet } from '../types/resume'

const CATEGORY_HINTS: Array<[SnippetCategory, string[]]> = [
  ['project', ['项目', 'project', '经历描述', '项目职责', '项目描述', 'responsibility']],
  ['internship', ['实习', '工作经历', '公司', '岗位职责', 'experience']],
  ['education', ['教育', '学校', '专业', '学院', 'education']],
  ['award', ['获奖', '奖项', '荣誉', '竞赛', 'award']],
  ['skill', ['技能', '技术栈', '工具', 'skill']],
  ['selfDescription', ['自我评价', '个人优势', '自我介绍', '评价', 'summary']],
  ['commonAnswer', ['职业规划', '为什么', '原因', '开放问题', 'answer']],
]

export function recommendedCategories(field: ActiveFieldDescriptor | null): SnippetCategory[] {
  if (!field) return []
  const text = [
    field.labelText,
    field.placeholder,
    field.name,
    field.id,
    field.ariaLabel,
    field.nearbyText,
    field.sectionText,
  ].filter(Boolean).join(' ').toLocaleLowerCase()
  return CATEGORY_HINTS
    .filter(([, hints]) => hints.some((hint) => text.includes(hint.toLocaleLowerCase())))
    .map(([category]) => category)
}

export function recommendationScore(snippet: TextSnippet, categories: SnippetCategory[]): number {
  let score = 0
  if (snippet.category && categories.includes(snippet.category)) score += 100
  if (snippet.favorite) score += 12
  if (snippet.lastUsedAt) score += 8
  score += Math.min(snippet.useCount ?? 0, 10)
  return score
}
