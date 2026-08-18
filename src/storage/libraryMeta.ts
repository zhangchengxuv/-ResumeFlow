import type {
  GroupedLibraryCategory,
  GroupedLibraryItem,
  LegacyTextSnippet,
  LibraryCategory,
  LibraryChildItem,
  LibraryItem,
  PlainLibraryItem,
} from '../types/resume'

const CATEGORY_KEYWORDS: Array<[LibraryCategory, string[]]> = [
  ['project', ['项目', 'project', '职责', '技术栈', '系统', '平台']],
  ['internship', ['实习', '工作', '公司', '部门', '岗位', 'experience']],
  ['education', ['教育', '学校', '学院', '专业', 'gpa', '成绩']],
  ['award', ['获奖', '奖项', '奖', '竞赛', '荣誉']],
  ['skill', ['技能', '技术', '工具', '语言', 'skill']],
  ['selfDescription', ['自我', '评价', '优势', '介绍', '性格']],
  ['commonAnswer', ['为什么', '职业规划', '规划', '回答', '问答']],
]

export const libraryCategoryLabel: Record<LibraryCategory, string> = {
  project: '项目',
  internship: '实习',
  education: '教育',
  award: '获奖',
  skill: '技能',
  selfDescription: '自述',
  commonAnswer: '问答',
  other: '其他',
}

export const groupedCategoryLabel: Record<GroupedLibraryCategory, string> = {
  project: '项目分组',
  education: '教育分组',
  internship: '实习分组',
  award: '获奖分组',
}

export const defaultChildrenByCategory: Record<GroupedLibraryCategory, Array<Omit<LibraryChildItem, 'id'>>> = {
  project: [
    { key: 'description', label: '项目描述', content: '' },
    { key: 'responsibilities', label: '项目职责', content: '' },
    { key: 'outcome', label: '项目成果', content: '' },
    { key: 'techStack', label: '技术栈', content: '' },
  ],
  education: [
    { key: 'school', label: '学校', content: '' },
    { key: 'major', label: '专业', content: '' },
    { key: 'degree', label: '学历', content: '' },
    { key: 'description', label: '教育经历描述', content: '' },
  ],
  internship: [
    { key: 'company', label: '公司', content: '' },
    { key: 'role', label: '岗位', content: '' },
    { key: 'responsibilities', label: '实习职责', content: '' },
    { key: 'outcome', label: '实习成果', content: '' },
  ],
  award: [
    { key: 'name', label: '奖项名称', content: '' },
    { key: 'time', label: '获奖时间', content: '' },
    { key: 'level', label: '奖项级别', content: '' },
    { key: 'description', label: '奖项描述', content: '' },
  ],
}

export function inferLibraryCategory(title = '', content = ''): LibraryCategory {
  const haystack = `${title} ${content}`.toLocaleLowerCase()
  return CATEGORY_KEYWORDS.find(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))?.[0] ?? 'other'
}

export function normalizePlainItem(item: Partial<PlainLibraryItem> & Pick<PlainLibraryItem, 'id' | 'title' | 'content'>): PlainLibraryItem {
  return {
    id: item.id,
    itemType: 'plain',
    category: item.category ?? inferLibraryCategory(item.title, item.content),
    title: item.title,
    content: item.content,
    favorite: Boolean(item.favorite),
    lastUsedAt: item.lastUsedAt,
    useCount: item.useCount ?? 0,
  }
}

export function normalizeGroupedItem(item: Partial<GroupedLibraryItem> & Pick<GroupedLibraryItem, 'id' | 'category' | 'title'>): GroupedLibraryItem {
  const defaults = defaultChildrenByCategory[item.category]
  return {
    id: item.id,
    itemType: 'group',
    category: item.category,
    title: item.title,
    subtitle: item.subtitle,
    favorite: Boolean(item.favorite),
    lastUsedAt: item.lastUsedAt,
    useCount: item.useCount ?? 0,
    children: (item.children?.length ? item.children : defaults.map((child, index) => ({
      id: `${item.id}-child-${index + 1}`,
      ...child,
    }))).map((child, index) => ({
      id: child.id || `${item.id}-child-${index + 1}`,
      key: child.key || `child-${index + 1}`,
      label: child.label || `子项 ${index + 1}`,
      content: child.content || '',
      lastUsedAt: child.lastUsedAt,
      useCount: child.useCount ?? 0,
    })),
  }
}

export function normalizeLibraryItem(item: LibraryItem): LibraryItem {
  return item.itemType === 'group' ? normalizeGroupedItem(item) : normalizePlainItem(item)
}

export function libraryItemFromLegacySnippet(snippet: LegacyTextSnippet): PlainLibraryItem {
  return normalizePlainItem({
    id: snippet.id,
    title: snippet.title,
    content: snippet.content,
    category: snippet.category ?? inferLibraryCategory(snippet.title, snippet.content),
    favorite: snippet.favorite,
    lastUsedAt: snippet.lastUsedAt,
    useCount: snippet.useCount,
  })
}

export function makeGroupedLibraryItem(category: GroupedLibraryCategory, title = ''): GroupedLibraryItem {
  const id = crypto.randomUUID()
  return normalizeGroupedItem({
    id,
    category,
    title,
    children: defaultChildrenByCategory[category].map((child) => ({ id: crypto.randomUUID(), ...child })),
  })
}

export function getLibraryItemText(item: LibraryItem): string {
  if (item.itemType === 'plain') return `${item.title} ${item.content} ${libraryCategoryLabel[item.category]}`
  return `${item.title} ${item.subtitle ?? ''} ${libraryCategoryLabel[item.category]} ${item.children.map((child) => `${child.label} ${child.content}`).join(' ')}`
}

export const snippetCategoryLabel = libraryCategoryLabel
export const inferSnippetCategory = inferLibraryCategory
export const normalizeSnippet = libraryItemFromLegacySnippet
