import { useMemo, useState } from 'react'
import { getRecommendedChild, recommendedCategories, recommendedChildKey, recommendationScore } from '../../adapters/snippetRecommendations'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { FormField, TextAreaField } from '../../components/FormField'
import { Icon } from '../../components/Icon'
import { libraryCategoryLabel, makeGroupedLibraryItem, normalizeGroupedItem, normalizePlainItem } from '../../storage/libraryMeta'
import type { ActiveFieldDescriptor } from '../../types/fields'
import type { GroupedLibraryCategory, LibraryChildItem, LibraryItem, PlainLibraryItem, Resume } from '../../types/resume'
import { insertIntoActiveField } from '../../utils/chrome'

interface Props {
  resume: Resume
  activeField: ActiveFieldDescriptor | null
  onCommit: (resume: Resume, message: string) => Promise<void>
  notify: (message: string) => void
}

type FilterMode = 'recent' | 'favorite' | 'all'
type CreateType = 'plain' | GroupedLibraryCategory

const createOptions: Array<{ value: CreateType; label: string }> = [
  { value: 'plain', label: '普通条目' },
  { value: 'project', label: '项目分组' },
  { value: 'education', label: '教育分组' },
  { value: 'internship', label: '实习分组' },
  { value: 'award', label: '获奖分组' },
]

const childKeyOptions = ['description', 'responsibilities', 'outcome', 'techStack', 'school', 'major', 'degree', 'company', 'role', 'name', 'time', 'level', 'other']

const preview = (content: string) => content.replace(/\s+/g, ' ').trim()
const isGroupedCategory = (value: CreateType): value is GroupedLibraryCategory => value !== 'plain'

function targetText(field: ActiveFieldDescriptor | null): string {
  return field?.labelText || field?.placeholder || field?.name || field?.id || ''
}

function makePlainItem(): PlainLibraryItem {
  return normalizePlainItem({
    id: crypto.randomUUID(),
    title: '',
    content: '',
    category: 'other',
    favorite: false,
    useCount: 0,
  })
}

function makeChild(): LibraryChildItem {
  return { id: crypto.randomUUID(), key: 'other', label: '新子项', content: '', useCount: 0 }
}

function getSearchHitLabels(item: LibraryItem, query: string): string[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery || item.itemType === 'plain') return []
  return item.children
    .filter((child) => `${child.label} ${child.content}`.toLocaleLowerCase().includes(normalizedQuery))
    .map((child) => child.label)
}

function itemMatchesQuery(item: LibraryItem, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return true
  if (item.itemType === 'plain') {
    return `${item.title} ${item.content} ${libraryCategoryLabel[item.category]}`.toLocaleLowerCase().includes(normalizedQuery)
  }
  return `${item.title} ${item.subtitle ?? ''} ${libraryCategoryLabel[item.category]} ${item.children.map((child) => `${child.label} ${child.content}`).join(' ')}`.toLocaleLowerCase().includes(normalizedQuery)
}

export function SnippetsPage({ resume, activeField, onCommit, notify }: Props) {
  const [editing, setEditing] = useState<LibraryItem | null>(null)
  const [createType, setCreateType] = useState<CreateType>('plain')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('recent')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [menuId, setMenuId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState('')

  const recommendationCategories = useMemo(() => recommendedCategories(activeField), [activeField])
  const childKey = useMemo(() => recommendedChildKey(activeField), [activeField])

  const visibleItems = useMemo(() => {
    return resume.libraryItems
      .filter((item) => {
        if (filter === 'favorite' && !item.favorite) return false
        if (filter === 'recent' && !item.lastUsedAt && item.useCount === 0) return recommendationCategories.length > 0
        return itemMatchesQuery(item, query)
      })
      .sort((left, right) => {
        const recommendationDelta = recommendationScore(right, recommendationCategories, childKey) - recommendationScore(left, recommendationCategories, childKey)
        if (recommendationDelta) return recommendationDelta
        if (filter === 'recent') return (Date.parse(right.lastUsedAt ?? '') || 0) - (Date.parse(left.lastUsedAt ?? '') || 0)
        if (Number(right.favorite) !== Number(left.favorite)) return Number(right.favorite) - Number(left.favorite)
        return left.title.localeCompare(right.title)
      })
  }, [childKey, filter, query, recommendationCategories, resume.libraryItems])

  const startNew = () => {
    setMenuId('')
    setConfirmDeleteId('')
    setEditing(isGroupedCategory(createType) ? makeGroupedLibraryItem(createType) : makePlainItem())
  }

  const save = async () => {
    if (!editing?.title.trim()) return
    const saved = editing.itemType === 'group'
      ? normalizeGroupedItem({ ...editing, title: editing.title.trim(), subtitle: editing.subtitle?.trim() })
      : normalizePlainItem({ ...editing, title: editing.title.trim(), content: editing.content.trim() })
    if (saved.itemType === 'plain' && !saved.content.trim()) return
    const exists = resume.libraryItems.some((item) => item.id === saved.id)
    const nextItems = exists
      ? resume.libraryItems.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...resume.libraryItems]
    await onCommit({ ...resume, libraryItems: nextItems }, '资料已保存')
    setEditing(null)
  }

  const copy = async (content: string) => {
    await navigator.clipboard.writeText(content)
    notify('已复制')
  }

  const markUsed = async (itemId: string, childId?: string) => {
    const now = new Date().toISOString()
    await onCommit({
      ...resume,
      libraryItems: resume.libraryItems.map((item) => {
        if (item.id !== itemId) return item
        if (item.itemType === 'plain' || !childId) {
          return { ...item, lastUsedAt: now, useCount: item.useCount + 1 }
        }
        return {
          ...item,
          lastUsedAt: now,
          useCount: item.useCount + 1,
          children: item.children.map((child) => child.id === childId ? {
            ...child,
            lastUsedAt: now,
            useCount: (child.useCount ?? 0) + 1,
          } : child),
        }
      }),
    }, '已插入')
  }

  const insertContent = async (item: LibraryItem, content: string, mode: 'replace' | 'append' = 'replace', childId?: string) => {
    const result = await insertIntoActiveField(content, mode)
    notify(result.message)
    if (result.ok) await markUsed(item.id, childId)
  }

  const toggleFavorite = async (item: LibraryItem) => {
    await onCommit({
      ...resume,
      libraryItems: resume.libraryItems.map((entry) => entry.id === item.id ? { ...entry, favorite: !entry.favorite } : entry),
    }, item.favorite ? '已取消收藏' : '已收藏')
    setMenuId('')
  }

  const remove = async (item: LibraryItem) => {
    await onCommit({ ...resume, libraryItems: resume.libraryItems.filter((entry) => entry.id !== item.id) }, '资料已删除')
    setMenuId('')
    setConfirmDeleteId('')
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateChild = (childId: string, patch: Partial<LibraryChildItem>) => {
    if (!editing || editing.itemType !== 'group') return
    setEditing({
      ...editing,
      children: editing.children.map((child) => child.id === childId ? { ...child, ...patch } : child),
    })
  }

  const moveChild = (childId: string, direction: -1 | 1) => {
    if (!editing || editing.itemType !== 'group') return
    const index = editing.children.findIndex((child) => child.id === childId)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= editing.children.length) return
    const children = [...editing.children]
    const [child] = children.splice(index, 1)
    children.splice(targetIndex, 0, child)
    setEditing({ ...editing, children })
  }

  const removeChild = (childId: string) => {
    if (!editing || editing.itemType !== 'group') return
    setEditing({ ...editing, children: editing.children.filter((child) => child.id !== childId) })
  }

  return <div className="page-stack snippets-page">
    <header className="page-header page-header--split">
      <div><span className="eyebrow">可复用内容</span><h1>资料库</h1><p>{resume.libraryItems.length} 条资料</p></div>
      <div className="create-inline">
        <select value={createType} onChange={(event) => setCreateType(event.target.value as CreateType)} aria-label="新建类型">
          {createOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
        <Button variant="primary" icon="plus" onClick={startNew}>新建</Button>
      </div>
    </header>

    <section className="snippet-tools">
      <label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、子项、经历、技能..." /></label>
      <div className="segmented-control">
        <button className={filter === 'recent' ? 'is-active' : ''} onClick={() => setFilter('recent')}>最近使用</button>
        <button className={filter === 'favorite' ? 'is-active' : ''} onClick={() => setFilter('favorite')}>收藏</button>
        <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>全部</button>
      </div>
      <p className="target-hint">{activeField ? `当前字段：${targetText(activeField) || activeField.editableType}${childKey ? ` · 推荐子项 ${childKey}` : ''}` : '请先点击网页中的输入框'}</p>
    </section>

    {editing && <section className="editor-panel library-editor">
      <div className="section-heading"><div><h2>{resume.libraryItems.some((item) => item.id === editing.id) ? '编辑资料' : '新建资料'}</h2><p>{editing.itemType === 'group' ? '父级用于归档，展开后可维护多个可插入子项。' : '普通条目会作为单条素材直接插入。'}</p></div></div>
      <FormField label="标题" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="例如：项目名称或常用回答" autoFocus />
      {editing.itemType === 'plain' ? <>
        <label className="form-field">类型
          <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value as PlainLibraryItem['category'] })}>
            {Object.entries(libraryCategoryLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <TextAreaField label="内容" rows={7} value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} placeholder="输入可重复使用的求职文本" />
      </> : <>
        <label className="form-field">分组类型
          <select value={editing.category} onChange={(event) => {
            const next = makeGroupedLibraryItem(event.target.value as GroupedLibraryCategory)
            setEditing({ ...next, id: editing.id, title: editing.title, subtitle: editing.subtitle, favorite: editing.favorite, lastUsedAt: editing.lastUsedAt, useCount: editing.useCount })
          }}>
            {createOptions.filter((option) => option.value !== 'plain').map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <FormField label="副标题" value={editing.subtitle ?? ''} onChange={(event) => setEditing({ ...editing, subtitle: event.target.value })} placeholder="例如：康复机器人 / 控制策略" />
        <div className="child-editor-list">
          {editing.children.map((child, index) => <section className="child-editor" key={child.id}>
            <div className="child-editor__top">
              <strong>子项 {index + 1}</strong>
              <div>
                <button className="icon-button" title="上移" disabled={index === 0} onClick={() => moveChild(child.id, -1)}><Icon name="chevron" /></button>
                <button className="icon-button icon-button--down" title="下移" disabled={index === editing.children.length - 1} onClick={() => moveChild(child.id, 1)}><Icon name="chevron" /></button>
                <button className="icon-button" title="删除子项" onClick={() => removeChild(child.id)}><Icon name="trash" /></button>
              </div>
            </div>
            <div className="child-editor__grid">
              <label className="form-field">Key
                <select value={child.key} onChange={(event) => updateChild(child.id, { key: event.target.value })}>
                  {childKeyOptions.map((key) => <option value={key} key={key}>{key}</option>)}
                </select>
              </label>
              <FormField label="Label" value={child.label} onChange={(event) => updateChild(child.id, { label: event.target.value })} />
            </div>
            <TextAreaField label="内容" rows={4} value={child.content} onChange={(event) => updateChild(child.id, { content: event.target.value })} />
          </section>)}
        </div>
        <Button variant="quiet" icon="plus" onClick={() => setEditing({ ...editing, children: [...editing.children, makeChild()] })}>新增子项</Button>
      </>}
      <div className="editor-actions"><Button variant="quiet" onClick={() => setEditing(null)}>取消</Button><Button variant="primary" icon="check" disabled={!editing.title.trim() || (editing.itemType === 'plain' && !editing.content.trim())} onClick={save}>保存</Button></div>
    </section>}

    {!editing && resume.libraryItems.length === 0 && <EmptyState title="还没有资料" description="保存项目分组、项目职责、自我评价或开放问题回答，在求职表单中快速插入。" action="新建资料" onAction={startNew} />}

    {!editing && visibleItems.length > 0 && <div className="snippet-list compact-list">
      {recommendationCategories.length > 0 && <div className="list-kicker">推荐</div>}
      {visibleItems.map((item) => {
        const isRecommended = recommendationScore(item, recommendationCategories, childKey) >= 100
        const hits = getSearchHitLabels(item, query)
        const recommendedChild = item.itemType === 'group' ? getRecommendedChild(item, activeField) : undefined
        const isExpanded = expandedIds.has(item.id) || hits.length > 0
        return <article className={`snippet-row library-row ${item.itemType === 'group' ? 'library-row--group' : ''} ${isRecommended ? 'snippet-row--recommended' : ''}`} key={item.id}>
          {item.itemType === 'plain' ? <button className="snippet-row__content" onClick={() => void insertContent(item, item.content)}>
            <span className="snippet-row__title"><strong>{item.title}</strong>{item.favorite && <Icon name="star" size={13} />}</span>
            <p>{preview(item.content)}</p>
            <small>{libraryCategoryLabel[item.category]} / {item.content.length} 字{item.useCount ? ` / ${item.useCount} 次` : ''}</small>
          </button> : <div className="snippet-row__content">
            <button className="group-title-button" onClick={() => toggleExpanded(item.id)}>
              <span className="snippet-row__title"><strong>{item.title}</strong>{item.favorite && <Icon name="star" size={13} />}</span>
              {item.subtitle && <p>{item.subtitle}</p>}
              <small>{libraryCategoryLabel[item.category]} / {item.children.length} 个子项{item.useCount ? ` / ${item.useCount} 次` : ''}{hits.length ? ` / 命中：${hits.slice(0, 2).join('、')}` : ''}</small>
            </button>
            {recommendedChild && <button className="quick-child-button" onClick={() => void insertContent(item, recommendedChild.content, 'replace', recommendedChild.id)}>
              插入推荐：{recommendedChild.label}
            </button>}
          </div>}
          <div className="snippet-row__actions">
            {item.itemType === 'plain' && <button className="icon-button" title="复制" aria-label={`复制 ${item.title}`} onClick={() => void copy(item.content)}><Icon name="copy" /></button>}
            <button className="icon-button" title="更多" aria-label={`更多 ${item.title}`} onClick={() => { setMenuId(menuId === item.id ? '' : item.id); setConfirmDeleteId('') }}><Icon name="more" /></button>
            {menuId === item.id && <div className="more-menu">
              {confirmDeleteId === item.id ? <>
                <button className="danger-text" onClick={() => void remove(item)}>确认删除</button>
                <button onClick={() => setConfirmDeleteId('')}>取消</button>
              </> : <>
                <button onClick={() => { setEditing(item); setMenuId('') }}>编辑</button>
                <button onClick={() => void toggleFavorite(item)}>{item.favorite ? '取消收藏' : '收藏'}</button>
                <button onClick={() => setConfirmDeleteId(item.id)}>删除</button>
              </>}
            </div>}
          </div>
          {item.itemType === 'group' && isExpanded && <div className="group-children">
            {item.children.map((child) => <article className={`group-child ${child.key === childKey ? 'group-child--recommended' : ''}`} key={child.id}>
              <div>
                <strong>{child.label}</strong>
                <p>{preview(child.content) || '暂无内容'}</p>
              </div>
              <div className="group-child__actions">
                <button className="icon-button" title="插入" disabled={!child.content.trim()} onClick={() => void insertContent(item, child.content, 'replace', child.id)}><Icon name="insert" /></button>
                <button className="icon-button" title="复制" disabled={!child.content.trim()} onClick={() => void copy(child.content)}><Icon name="copy" /></button>
              </div>
            </article>)}
          </div>}
        </article>
      })}
    </div>}

    {!editing && visibleItems.length === 0 && <EmptyState title="没有匹配的资料" description="换个关键词，或切到全部查看。" action="查看全部" onAction={() => setFilter('all')} />}
  </div>
}
