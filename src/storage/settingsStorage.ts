import { defaultSettings, type Settings } from '../types/settings'

const KEY = 'resumeflow.settings.v1'

export async function loadSettings(): Promise<Settings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<Settings>) } : defaultSettings
  }
  const result = await chrome.storage.local.get(KEY)
  return { ...defaultSettings, ...(result[KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    localStorage.setItem(KEY, JSON.stringify(settings))
    return
  }
  await chrome.storage.local.set({ [KEY]: settings })
}
