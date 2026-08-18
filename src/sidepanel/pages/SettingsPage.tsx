import { Icon } from '../../components/Icon'
import type { Settings } from '../../types/settings'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => Promise<void>
}

export function SettingsPage({ settings, onChange }: Props) {
  return <div className="page-stack">
    <header className="page-header"><span className="eyebrow">偏好与隐私</span><h1>设置</h1><p>控制扫描行为和结果展示。</p></header>
    <section className="settings-section"><h2>扫描与填写</h2>
      <label className="setting-row"><div><strong>打开面板时自动扫描</strong><span>只读取字段结构，不会自动填写。</span></div><input className="switch" type="checkbox" checked={settings.autoScan} onChange={(event) => void onChange({ ...settings, autoScan: event.target.checked })} /></label>
      <label className="setting-row"><div><strong>默认填充范围</strong><span>低置信度字段始终需要手动选择。</span></div><select value={settings.fillThreshold} onChange={(event) => void onChange({ ...settings, fillThreshold: Number(event.target.value) as Settings['fillThreshold'] })}><option value="0.6">中、高置信度</option><option value="0.85">仅高置信度</option></select></label>
      <label className="setting-row"><div><strong>始终显示识别依据</strong><span>展开每个字段的评分细节。</span></div><input className="switch" type="checkbox" checked={settings.showMatchReasons} onChange={(event) => void onChange({ ...settings, showMatchReasons: event.target.checked })} /></label>
    </section>
    <section className="settings-section"><h2>数据与安全</h2><div className="privacy-note"><Icon name="info" size={18} /><div><strong>仅存储在本地</strong><p>ResumeFlow 不包含服务器、第三方分析、广告或遥测。简历数据保存在浏览器的 <code>chrome.storage.local</code> 中，卸载扩展会同时移除这些数据。</p></div></div></section>
    <section className="settings-section about-block"><h2>关于</h2><dl><div><dt>版本</dt><dd>0.1.0</dd></div><div><dt>数据模型</dt><dd>Resume Schema v1</dd></div><div><dt>匹配方式</dt><dd>本地规则评分</dd></div></dl></section>
  </div>
}
