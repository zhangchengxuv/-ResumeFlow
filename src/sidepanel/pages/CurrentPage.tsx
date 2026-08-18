import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { getResumeValue } from '../../adapters/resumeValues'
import { fieldLabel, MATCH_RULES } from '../../matcher/rules'
import { applyFieldMappings, loadFieldMappings, saveFieldMapping } from '../../storage/fieldMappingStorage'
import type { ActiveFieldDescriptor, ScannedField } from '../../types/fields'
import type { Resume, ResumeFieldPath } from '../../types/resume'
import type { Settings } from '../../types/settings'
import { fillActiveTab, scanActiveTab } from '../../utils/chrome'

interface Props {
  resume: Resume
  settings: Settings
  notify: (message: string) => void
}

const descriptorName = (field: ScannedField) => field.labelText || field.label || field.ariaLabel || field.placeholder || field.name || field.id || '未命名字段'
const AUTO_FILL_THRESHOLD = 0.9
const REVIEW_THRESHOLD = 0.65

function toActiveDescriptor(field: ScannedField, hostname: string): ActiveFieldDescriptor {
  return {
    elementId: field.elementId,
    hostname,
    url: '',
    tagName: field.tagName,
    type: field.type,
    id: field.id,
    name: field.name,
    placeholder: field.placeholder,
    ariaLabel: field.ariaLabel,
    labelText: field.labelText ?? field.label,
    nearbyText: field.nearbyText,
    sectionText: field.sectionText,
    editableType: field.editableType,
    selectorCandidates: field.selectorCandidates,
    pickedAt: new Date().toISOString(),
  }
}

export function CurrentPage({ resume, settings, notify }: Props) {
  const [fields, setFields] = useState<ScannedField[]>([])
  const [hostname, setHostname] = useState('')
  const [repeatGroupCount, setRepeatGroupCount] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')

  const scan = useCallback(async () => {
    setStatus('loading')
    setError('')
    setSummary('')
    try {
      const result = await scanActiveTab()
      if (!result.ok) throw new Error(result.error || '扫描失败')
      const mappings = await loadFieldMappings()
      const mappedMatches = applyFieldMappings(result.fields, mappings, result.hostname)
      setHostname(result.hostname)
      setRepeatGroupCount(result.repeatGroups.length)
      setFields(result.fields.map((field, index) => {
        const mapped = mappedMatches[index]
        const match = mapped ?? field.match
        const path = match.targetField
        const value = path ? getResumeValue(resume, path) : ''
        return {
          ...field,
          match,
          value,
          selected: Boolean(path && value && match.confidence >= Math.max(AUTO_FILL_THRESHOLD, settings.fillThreshold)),
        }
      }))
      setStatus('ready')
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : '扫描失败')
      setStatus('error')
    }
  }, [resume, settings.fillThreshold])

  useEffect(() => {
    if (!settings.autoScan) return undefined
    const timer = window.setTimeout(() => void scan(), 0)
    return () => window.clearTimeout(timer)
  }, [scan, settings.autoScan])

  const selected = useMemo(() => fields.filter((field) => field.selected && field.match.targetField && field.value), [fields])

  const changeMapping = async (index: number, path: ResumeFieldPath | '') => {
    const target = fields[index]
    setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? {
      ...field,
      match: { targetField: path, confidence: path ? 0.9 : 0, reasons: path ? ['用户手动指定映射'] : ['已取消映射'], source: path ? 'mapping' : 'rule' },
      value: path ? getResumeValue(resume, path) : '',
      selected: Boolean(path && getResumeValue(resume, path)),
    } : field))
    if (target && path) {
      await saveFieldMapping(toActiveDescriptor(target, hostname), path)
      notify('映射已保存')
    }
  }

  const fill = async () => {
    try {
      const result = await fillActiveTab(selected.map((field) => ({
        elementId: field.elementId,
        value: field.value,
        targetField: field.match.targetField as ResumeFieldPath,
      })))
      const text = `成功填写 ${result.filled} 项${result.skipped ? `，${result.skipped} 项需要手动确认` : ''}`
      setSummary(text)
      notify(text)
    } catch {
      setSummary('填写失败，请刷新页面后重新扫描')
    }
  }

  if (status === 'idle') return <EmptyState title="准备扫描当前页面" description="扫描只读取表单结构，不会修改网页内容。" action="开始扫描" onAction={scan} />
  if (status === 'loading') return <div className="loading-state"><span className="spinner" /><p>正在分析页面字段</p></div>
  if (status === 'error') return <div className="page-stack"><div className="notice notice--error"><Icon name="info" /><div><strong>无法扫描当前页面</strong><span>{error}</span></div></div><EmptyState title="扫描未完成" description="请确认页面已加载完成，刷新招聘页面后再试。" action="重新扫描" onAction={scan} /></div>

  return <div className="current-page">
    <header className="page-header page-header--split">
      <div><span className="eyebrow">当前网站</span><h1>{hostname || '当前页面'}</h1><p>发现 {fields.length} 个可填写字段{repeatGroupCount ? `，${repeatGroupCount} 组重复结构` : ''}</p></div>
      <Button variant="quiet" icon="refresh" onClick={scan}>重新扫描</Button>
    </header>

    {summary && <div className="notice notice--success"><Icon name="check" /><span>{summary}</span></div>}

    {fields.length === 0 ? <EmptyState title="暂未发现可填写字段" description="当前页面可能没有简历表单，或者表单尚未加载完成。" action="重新扫描" onAction={scan} /> :
      <div className="match-list">
        {fields.map((field, index) => {
          const confidence = Math.round(field.match.confidence * 100)
          const level = confidence >= 90 ? 'high' : confidence >= 65 ? 'medium' : 'low'
          const needsReview = confidence >= 65 && confidence < 90
          return <article className={`match-row ${!field.selected ? 'match-row--disabled' : ''}`} key={field.elementId}>
            <label className="check-control" title={field.selected ? '取消填写' : '选择填写'}>
              <input type="checkbox" checked={field.selected} disabled={!field.match.targetField || !field.value || field.match.confidence < REVIEW_THRESHOLD}
                onChange={(event) => setFields((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} />
              <span />
            </label>
            <div className="match-row__body">
              <div className="match-row__top">
                <div><strong>{fieldLabel(field.match.targetField)}</strong><span className="source-label">网页字段：{descriptorName(field)}</span></div>
                <span className={`confidence confidence--${level}`}>{field.match.source === 'mapping' ? '历史' : `${confidence}%`}</span>
              </div>
              {needsReview && <p className="review-note">推荐，需要确认后填写</p>}
              <p className={field.value ? 'field-value' : 'field-value field-value--empty'}>{field.value || '简历中暂无对应内容'}</p>
              <select className="mapping-select" value={field.match.targetField} onChange={(event) => void changeMapping(index, event.target.value as ResumeFieldPath | '')} aria-label="修改字段映射">
                <option value="">暂不映射</option>
                {MATCH_RULES.map((rule) => <option value={rule.path} key={rule.path}>{rule.label} · {rule.path}</option>)}
              </select>
              {(settings.showMatchReasons || field.match.confidence < 0.65) && <details className="match-details"><summary>查看识别依据</summary><ul>{field.match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>}
            </div>
          </article>
        })}
      </div>}

    {fields.length > 0 && <footer className="action-bar">
      <span>{selected.length} / {fields.length} 项已选择</span>
      <Button variant="primary" icon="check" disabled={selected.length === 0} onClick={fill}>填写 {selected.length} 个字段</Button>
    </footer>}
  </div>
}
