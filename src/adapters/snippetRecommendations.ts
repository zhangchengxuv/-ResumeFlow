import type { ActiveFieldDescriptor } from '../types/fields'
import type { GroupedLibraryItem, LibraryCategory, LibraryItem } from '../types/resume'

const CATEGORY_HINTS: Array<[LibraryCategory, string[]]> = [
  ['project', ['项目', 'project', '经历描述', '项目职责', '项目描述', 'responsibility']],
  ['internship', ['实习', '工作经历', '公司', '岗位职责', 'experience']],
  ['education', ['教育', '学校', '专业', '学院', 'education']],
  ['award', ['获奖', '奖项', '荣誉', '竞赛', 'award']],
  ['skill', ['技能', '技术栈', '工具', 'skill']],
  ['selfDescription', ['自我评价', '个人优势', '自我介绍', '评价', 'summary']],
  ['commonAnswer', ['职业规划', '为什么', '原因', '开放问题', 'answer']],
]

const CHILD_HINTS: Array<[string, string[]]> = [
  ['responsibilities', ['项目职责', '个人职责', '主要职责', '负责内容', 'responsibility', 'contribution']],
  ['techStack', ['技术栈', '项目技术', '使用技术', '技术工具', 'tech stack', 'technologies']],
  ['outcome', ['项目成果', '成果', '产出', '结果', 'achievement', 'outcome']],
  ['description', ['项目描述', '项目介绍', '项目内容', '经历描述', 'description', 'overview']],
]

function activeFieldText(field: ActiveFieldDescriptor | null): string {
  if (!field) return ''
  return [
    field.labelText,
    field.placeholder,
    field.name,
    field.id,
    field.ariaLabel,
    field.nearbyText,
    field.sectionText,
  ].filter(Boolean).join(' ').toLocaleLowerCase()
}

export function recommendedCategories(field: ActiveFieldDescriptor | null): LibraryCategory[] {
  const text = activeFieldText(field)
  if (!text) return []
  return CATEGORY_HINTS
    .filter(([, hints]) => hints.some((hint) => text.includes(hint.toLocaleLowerCase())))
    .map(([category]) => category)
}

export function recommendedChildKey(field: ActiveFieldDescriptor | null): string | undefined {
  const text = activeFieldText(field)
  if (!text) return undefined
  return CHILD_HINTS.find(([, hints]) => hints.some((hint) => text.includes(hint.toLocaleLowerCase())))?.[0]
}

export function getRecommendedChild(item: GroupedLibraryItem, field: ActiveFieldDescriptor | null) {
  const key = recommendedChildKey(field)
  return item.children.find((child) => child.key === key && child.content.trim()) ??
    item.children.find((child) => child.content.trim())
}

export function recommendationScore(item: LibraryItem, categories: LibraryCategory[], childKey?: string): number {
  let score = 0
  if (categories.includes(item.category)) score += 100
  if (item.itemType === 'group' && childKey && item.children.some((child) => child.key === childKey && child.content.trim())) score += 35
  if (item.favorite) score += 12
  if (item.lastUsedAt) score += 8
  score += Math.min(item.useCount, 10)
  return score
}
