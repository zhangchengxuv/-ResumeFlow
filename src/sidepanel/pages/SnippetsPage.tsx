import { useMemo, useState } from 'react'
import { recommendedCategories, recommendationScore } from '../../adapters/snippetRecommendations'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { FormField, TextAreaField } from '../../components/FormField'
import { Icon } from '../../components/Icon'
import { inferSnippetCategory, snippetCategoryLabel } from '../../storage/snippetMeta'
import type { ActiveFieldDescriptor } from '../../types/fields'
import type { Resume, SnippetCategory, TextSnippet } from '../../types/resume'
import { insertIntoActiveField } from '../../utils/chrome'

interface Props {
  resume: Resume
  activeField: ActiveFieldDescriptor | null
  onCommit: (resume: Resume, message: string) => Promise<void>
  notify: (message: string) => void
}

type FilterMode = 'recent' | 'favorite' | 'all'

const categories = Object.keys(snippetCategoryLabel) as SnippetCategory[]

const blankSnippet = (): TextSnippet => ({
  id: crypto.randomUUID(),
  title: '',
  content: '',
  category: 'other',
  favorite: false,
  useCount: 0,
  updatedAt: new Date().toISOString(),
})

const preview = (content: string) => content.replace(/\s+/g, ' ').trim()

function targetText(field: ActiveFieldDescriptor | null): string {
  return field?.labelText || field?.placeholder || field?.name || field?.id || ''
}

export function SnippetsPage({ resume, activeField, onCommit, notify }: Props) {
  const [editing, setEditing] = useState<TextSnippet | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('recent')
  const [menuId, setMenuId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState('')

  const recommendationCategories = useMemo(() => recommendedCategories(activeField), [activeField])

  const visibleSnippets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return resume.snippets
      .filter((item) => {
        if (filter === 'favorite' && !item.favorite) return false
        if (filter === 'recent' && !item.lastUsedAt && (item.useCount ?? 0) === 0) return recommendationCategories.length > 0
        if (!normalizedQuery) return true
        return `${item.title} ${item.content} ${snippetCategoryLabel[item.category ?? 'other']}`.toLocaleLowerCase().includes(normalizedQuery)
      })
      .sort((left, right) => {
        const recommendationDelta = recommendationScore(right, recommendationCategories) - recommendationScore(left, recommendationCategories)
        if (recommendationDelta) return recommendationDelta
        if (filter === 'recent') return (Date.parse(right.lastUsedAt ?? '') || 0) - (Date.parse(left.lastUsedAt ?? '') || 0)
        if (Number(right.favorite) !== Number(left.favorite)) return Number(right.favorite) - Number(left.favorite)
        return (right.title || '').localeCompare(left.title || '')
      })
  }, [filter, query, recommendationCategories, resume.snippets])

  const save = async () => {
    if (!editing?.title.trim() || !editing.content.trim()) return
    const exists = resume.snippets.some((item) => item.id === editing.id)
    const saved: TextSnippet = {
      ...editing,
      title: editing.title.trim(),
      content: editing.content.trim(),
      category: editing.category ?? inferSnippetCategory(editing.title, editing.content),
      favorite: Boolean(editing.favorite),
      useCount: editing.useCount ?? 0,
      updatedAt: new Date().toISOString(),
    }
    const next = { ...resume, snippets: exists ? resume.snippets.map((item) => item.id === saved.id ? saved : item) : [saved, ...resume.snippets] }
    await onCommit(next, '文本已保存')
    setEditing(null)
  }

  const copy = async (content: string) => {
    await navigator.clipboard.writeText(content)
    notify('已复制')
  }

  const markUsed = async (snippet: TextSnippet) => {
    const now = new Date().toISOString()
    await onCommit({
      ...resume,
      snippets: resume.snippets.map((item) => item.id === snippet.id ? {
        ...item,
        lastUsedAt: now,
        useCount: (item.useCount ?? 0) + 1,
      } : item),
    }, '已插入')
  }

  const insert = async (snippet: TextSnippet, mode: 'replace' | 'append' = 'replace') => {
    const result = await insertIntoActiveField(snippet.content, mode)
    notify(result.message)
    if (result.ok) await markUsed(snippet)
  }

  const toggleFavorite = async (snippet: TextSnippet) => {
    await onCommit({
      ...resume,
      snippets: resume.snippets.map((item) => item.id === snippet.id ? { ...item, favorite: !item.favorite } : item),
    }, snippet.favorite ? '已取消收藏' : '已收藏')
    setMenuId('')
  }

  const remove = async (snippet: TextSnippet) => {
    await onCommit({ ...resume, snippets: resume.snippets.filter((item) => item.id !== snippet.id) }, '文本已删除')
    setMenuId('')
    setConfirmDeleteId('')
  }

  return <div className="page-stack snippets-page">
    <header className="page-header page-header--split">
      <div><span className="eyebrow">可复用内容</span><h1>资料库</h1><p>{resume.snippets.length} 条素材</p></div>
      <Button variant="primary" icon="plus" onClick={() => setEditing(blankSnippet())}>新建</Button>
    </header>

    <section className="snippet-tools">
      <label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、经历、技能..." /></label>
      <div className="segmented-control">
        <button className={filter === 'recent' ? 'is-active' : ''} onClick={() => setFilter('recent')}>最近使用</button>
        <button className={filter === 'favorite' ? 'is-active' : ''} onClick={() => setFilter('favorite')}>收藏</button>
        <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>全部</button>
      </div>
      <p className="target-hint">{activeField ? `推荐：${targetText(activeField) || activeField.editableType}` : '请先点击网页中的输入框'}</p>
    </section>

    {editing && <section className="editor-panel">
      <div className="section-heading"><div><h2>{resume.snippets.some((item) => item.id === editing.id) ? '编辑文本' : '新建文本'}</h2><p>标题用于管理，内容会插入网页字段。</p></div></div>
      <FormField label="标题" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="例如：项目职责" autoFocus />
      <label className="form-field">类型
        <select value={editing.category ?? 'other'} onChange={(event) => setEditing({ ...editing, category: event.target.value as SnippetCategory })}>
          {categories.map((category) => <option value={category} key={category}>{snippetCategoryLabel[category]}</option>)}
        </select>
      </label>
      <TextAreaField label="内容" rows={7} value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} placeholder="输入可重复使用的求职文本" />
      <div className="editor-actions"><Button variant="quiet" onClick={() => setEditing(null)}>取消</Button><Button variant="primary" icon="check" disabled={!editing.title.trim() || !editing.content.trim()} onClick={save}>保存</Button></div>
    </section>}

    {!editing && resume.snippets.length === 0 && <EmptyState title="还没有资料" description="保存自我评价、项目职责、开放问题回答，在求职表单中快速插入。" action="新建文本" onAction={() => setEditing(blankSnippet())} />}

    {!editing && visibleSnippets.length > 0 && <div className="snippet-list compact-list">
      {recommendationCategories.length > 0 && <div className="list-kicker">推荐</div>}
      {visibleSnippets.map((item) => {
        const isRecommended = Boolean(item.category && recommendationCategories.includes(item.category))
        return <article className={`snippet-row ${isRecommended ? 'snippet-row--recommended' : ''}`} key={item.id}>
          <button className="snippet-row__content" onClick={() => void insert(item)}>
            <span className="snippet-row__title"><strong>{item.title}</strong>{item.favorite && <Icon name="star" size={13} />}</span>
            <p>{preview(item.content)}</p>
            <small>{snippetCategoryLabel[item.category ?? 'other']} / {item.content.length} 字{item.useCount ? ` / ${item.useCount} 次` : ''}</small>
          </button>
          <div className="snippet-row__actions">
            <button className="icon-button" title="复制" aria-label={`复制 ${item.title}`} onClick={(event) => { event.stopPropagation(); void copy(item.content) }}><Icon name="copy" /></button>
            <button className="icon-button" title="更多" aria-label={`更多 ${item.title}`} onClick={(event) => { event.stopPropagation(); setMenuId(menuId === item.id ? '' : item.id); setConfirmDeleteId('') }}><Icon name="more" /></button>
            {menuId === item.id && <div className="more-menu">
              {confirmDeleteId === item.id ? <>
                <button className="danger-text" onClick={() => void remove(item)}>确认删除</button>
                <button onClick={() => setConfirmDeleteId('')}>取消</button>
              </> : <>
                <button onClick={() => { setEditing({ ...item }); setMenuId('') }}>编辑</button>
                <button onClick={() => void toggleFavorite(item)}>{item.favorite ? '取消收藏' : '收藏'}</button>
                <button onClick={() => void copy(item.content)}>复制</button>
                <button onClick={() => void insert(item, 'append')}>追加插入</button>
                <button onClick={() => setConfirmDeleteId(item.id)}>删除</button>
              </>}
            </div>}
          </div>
        </article>
      })}
    </div>}

    {!editing && visibleSnippets.length === 0 && <EmptyState title="没有匹配的资料" description="换个关键词，或切到全部查看。" action="查看全部" onAction={() => setFilter('all')} />}
  </div>
}
