import type { SnippetCategory, TextSnippet } from '../types/resume'

const CATEGORY_KEYWORDS: Array<[SnippetCategory, string[]]> = [
  ['project', ['项目', 'project', '职责', '技术栈', '系统', '平台']],
  ['internship', ['实习', '工作', '公司', '部门', '岗位', 'experience']],
  ['education', ['教育', '学校', '学院', '专业', 'gpa', '成绩']],
  ['award', ['获奖', '奖项', '奖', '竞赛', '荣誉']],
  ['skill', ['技能', '技术', '工具', '语言', 'skill']],
  ['selfDescription', ['自我', '评价', '优势', '介绍', '性格']],
  ['commonAnswer', ['为什么', '职业规划', '规划', '回答', '问答']],
]

export const snippetCategoryLabel: Record<SnippetCategory, string> = {
  project: '项目',
  internship: '实习',
  education: '教育',
  award: '获奖',
  skill: '技能',
  selfDescription: '自述',
  commonAnswer: '问答',
  other: '其他',
}

export function inferSnippetCategory(title = '', content = ''): SnippetCategory {
  const haystack = `${title} ${content}`.toLocaleLowerCase()
  return CATEGORY_KEYWORDS.find(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))?.[0] ?? 'other'
}

export function normalizeSnippet(snippet: Partial<TextSnippet> & Pick<TextSnippet, 'id' | 'title' | 'content' | 'updatedAt'>): TextSnippet {
  return {
    ...snippet,
    category: snippet.category ?? inferSnippetCategory(snippet.title, snippet.content),
    favorite: Boolean(snippet.favorite),
    lastUsedAt: snippet.lastUsedAt,
    useCount: snippet.useCount ?? 0,
  }
}
