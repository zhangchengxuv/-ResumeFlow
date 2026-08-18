import type { ActiveFieldDescriptor, ContentMessage, FillResponse, InsertMode, InsertResult, ScanResponse } from '../types/fields'

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) throw new Error('请在已加载扩展的 Side Panel 中使用')
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error('无法访问当前标签页')
  return tab
}

async function sendToActiveTab<T>(message: ContentMessage): Promise<T> {
  const tab = await getActiveTab()
  return chrome.tabs.sendMessage(tab.id as number, message)
}

export async function scanActiveTab(): Promise<ScanResponse> {
  try {
    return await sendToActiveTab<ScanResponse>({ type: 'SCAN_PAGE' })
  } catch {
    throw new Error('无法扫描此页面。请刷新网页后重试；浏览器内部页面不允许扩展访问。')
  }
}

export async function fillActiveTab(items: Extract<ContentMessage, { type: 'FILL_FIELDS' }>['items']): Promise<FillResponse> {
  return sendToActiveTab<FillResponse>({ type: 'FILL_FIELDS', items })
}

export async function insertIntoActiveField(value: string, mode: InsertMode = 'replace'): Promise<InsertResult> {
  try {
    return await sendToActiveTab<InsertResult>({ type: 'INSERT_CONTENT', value, mode })
  } catch {
    return { ok: false, message: '无法访问当前页面输入框' }
  }
}

export async function getActiveField(): Promise<ActiveFieldDescriptor | null> {
  try {
    return await sendToActiveTab<ActiveFieldDescriptor | null>({ type: 'GET_ACTIVE_FIELD' })
  } catch {
    return null
  }
}

export async function startFieldPicker(): Promise<boolean> {
  try {
    await sendToActiveTab({ type: 'START_FIELD_PICKER' })
    return true
  } catch {
    return false
  }
}

export async function stopFieldPicker(): Promise<boolean> {
  try {
    await sendToActiveTab({ type: 'STOP_FIELD_PICKER' })
    return true
  } catch {
    return false
  }
}
