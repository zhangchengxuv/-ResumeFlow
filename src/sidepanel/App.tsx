import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Toast } from '../components/Toast'
import { fieldLabel, MATCH_RULES } from '../matcher/rules'
import { saveFieldMapping } from '../storage/fieldMappingStorage'
import { loadResume, saveResume } from '../storage/resumeStorage'
import { loadSettings, saveSettings } from '../storage/settingsStorage'
import type { ActiveFieldDescriptor, SidePanelMessage } from '../types/fields'
import type { Resume, ResumeFieldPath } from '../types/resume'
import { defaultSettings, type Settings } from '../types/settings'
import { getActiveField, startFieldPicker } from '../utils/chrome'
import { CurrentPage } from './pages/CurrentPage'
import { ResumePage } from './pages/ResumePage'
import { SettingsPage } from './pages/SettingsPage'
import { SnippetsPage } from './pages/SnippetsPage'
import { NAV_ITEMS, type PageId } from './nav'

const requestedPreview = new URLSearchParams(location.search).get('preview')
const initialPage: PageId = NAV_ITEMS.some((item) => item.id === requestedPreview) ? requestedPreview as PageId : 'current'

function describeTarget(field: ActiveFieldDescriptor | null): string {
  if (!field) return '请先点击网页中的输入框'
  return field.labelText || field.ariaLabel || field.placeholder || field.name || field.id || field.editableType
}

export function App() {
  const [page, setPage] = useState<PageId>(initialPage)
  const [resume, setResume] = useState<Resume | null>(null)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [activeField, setActiveField] = useState<ActiveFieldDescriptor | null>(null)
  const [mappingValue, setMappingValue] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  useEffect(() => {
    Promise.all([loadResume(), loadSettings()]).then(([storedResume, storedSettings]) => {
      setResume(storedResume)
      setSettings(storedSettings)
    }).catch(() => setError('无法读取浏览器本地数据，请重新加载扩展。'))
  }, [])

  useEffect(() => {
    void getActiveField().then(setActiveField)
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return undefined
    const listener = (message: SidePanelMessage) => {
      if (message.type === 'ACTIVE_FIELD_CHANGED' || message.type === 'FIELD_PICKED') {
        setActiveField(message.field)
        if (message.type === 'FIELD_PICKED') notify('已选择网页字段')
      }
      if (message.type === 'INSERT_RESULT') notify(message.result.message)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const commitResume = async (next: Resume, message = '已保存') => {
    setResume(next)
    await saveResume(next)
    notify(message)
  }

  const commitSettings = async (next: Settings) => {
    setSettings(next)
    await saveSettings(next)
    notify('设置已保存')
  }

  const pickField = async () => {
    const ok = await startFieldPicker()
    notify(ok ? '请在网页中点击要填写的字段' : '无法在当前页面开启字段选择')
  }

  const saveMapping = async (targetField: string) => {
    setMappingValue(targetField)
    if (!activeField || !targetField) return
    await saveFieldMapping(activeField, targetField as ResumeFieldPath)
    notify('映射已保存')
  }

  if (error) return <main className="fatal-state"><Icon name="info" size={22} /><h1>ResumeFlow 无法启动</h1><p>{error}</p></main>
  if (!resume) return <main className="loading-state loading-state--app"><span className="spinner" /><p>正在载入本地简历</p></main>

  return <div className="app-shell">
    <header className="app-brand"><div className="brand-mark">R</div><div><strong>ResumeFlow</strong><span>求职表单助手</span></div></header>
    <section className="target-strip">
      <div className="target-strip__summary">
        <span>当前目标</span>
        <strong>{activeField ? `当前填写：${describeTarget(activeField)}` : describeTarget(null)}</strong>
        {activeField && <small>{activeField.editableType} · {activeField.hostname}</small>}
      </div>
      <button className="icon-button" title="选择网页字段" aria-label="选择网页字段" onClick={() => void pickField()}><Icon name="scan" /></button>
      <select value={mappingValue} aria-label="保存字段映射" onChange={(event) => void saveMapping(event.target.value)} disabled={!activeField}>
        <option value="">字段映射</option>
        {MATCH_RULES.map((rule) => <option value={rule.path} key={rule.path}>{fieldLabel(rule.path)}</option>)}
      </select>
    </section>
    <main className="app-content">
      {page === 'current' && <CurrentPage resume={resume} settings={settings} notify={notify} />}
      {page === 'resume' && <ResumePage resume={resume} onChange={setResume} onSave={() => commitResume(resume)} />}
      {page === 'snippets' && <SnippetsPage resume={resume} activeField={activeField} onCommit={commitResume} notify={notify} />}
      {page === 'settings' && <SettingsPage settings={settings} onChange={commitSettings} />}
    </main>
    <nav className="app-nav" aria-label="主导航">{NAV_ITEMS.map((item) => <button className={page === item.id ? 'is-active' : ''} onClick={() => setPage(item.id)} key={item.id}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
    <Toast message={toast} />
  </div>
}
