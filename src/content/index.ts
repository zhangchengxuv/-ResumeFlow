import { fillElement, fillFields } from './filler'
import { describeField, detectRepeatGroups, isEditableField, scanPage } from './scanner'
import { matchFields } from '../matcher/matcher'
import type { ActiveFieldDescriptor, ContentMessage, InsertResult, ScanResponse, SidePanelMessage } from '../types/fields'

let activeElement: HTMLElement | null = null
let activeField: ActiveFieldDescriptor | null = null
let pickerEnabled = false
let hoveredPickerElement: HTMLElement | null = null

const PICKER_CLASS = 'resumeflow-field-picker-hover'
const STYLE_ID = 'resumeflow-field-picker-style'

function toActiveField(element: HTMLElement): ActiveFieldDescriptor {
  const descriptor = describeField(element)
  return {
    elementId: descriptor.elementId,
    hostname: location.hostname || 'local',
    url: location.href,
    tagName: descriptor.tagName,
    type: descriptor.type,
    id: descriptor.id,
    name: descriptor.name,
    placeholder: descriptor.placeholder,
    ariaLabel: descriptor.ariaLabel,
    labelText: descriptor.labelText ?? descriptor.label,
    nearbyText: descriptor.nearbyText,
    sectionText: descriptor.sectionText,
    editableType: descriptor.editableType,
    selectorCandidates: descriptor.selectorCandidates,
    pickedAt: new Date().toISOString(),
  }
}

function postToSidePanel(message: SidePanelMessage): void {
  try {
    void chrome.runtime.sendMessage(message)
  } catch {
    // The side panel may be closed; the content script still keeps the active field locally.
  }
}

function setActiveElement(element: HTMLElement): ActiveFieldDescriptor {
  activeElement = element
  activeField = toActiveField(element)
  postToSidePanel({ type: 'ACTIVE_FIELD_CHANGED', field: activeField })
  return activeField
}

function ensurePickerStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `.${PICKER_CLASS}{outline:2px solid #446b8f!important;outline-offset:2px!important;box-shadow:0 0 0 3px rgba(68,107,143,.16)!important;}`
  document.documentElement.append(style)
}

function clearPickerHover(): void {
  hoveredPickerElement?.classList.remove(PICKER_CLASS)
  hoveredPickerElement = null
}

function startPicker(): void {
  pickerEnabled = true
  ensurePickerStyle()
}

function stopPicker(): void {
  pickerEnabled = false
  clearPickerHover()
}

document.addEventListener('focusin', (event) => {
  if (isEditableField(event.target)) setActiveElement(event.target)
}, true)

document.addEventListener('focusout', (event) => {
  if (isEditableField(event.target) && activeElement === event.target) {
    activeField = toActiveField(event.target)
  }
}, true)

document.addEventListener('mouseover', (event) => {
  if (!pickerEnabled) return
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"]') : null
  if (!target || !isEditableField(target)) return
  clearPickerHover()
  hoveredPickerElement = target
  target.classList.add(PICKER_CLASS)
}, true)

document.addEventListener('mouseout', () => {
  if (pickerEnabled) clearPickerHover()
}, true)

document.addEventListener('click', (event) => {
  if (!pickerEnabled) return
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"]') : null
  if (!target || !isEditableField(target)) return
  event.preventDefault()
  event.stopPropagation()
  const picked = setActiveElement(target)
  stopPicker()
  postToSidePanel({ type: 'FIELD_PICKED', field: picked })
}, true)

function scan(): ScanResponse {
  const descriptors = scanPage()
  const matches = matchFields(descriptors)
  return {
    ok: true,
    url: location.href,
    hostname: location.hostname || 'local',
    fields: descriptors.map((field, index) => ({
      ...field,
      match: matches[index],
      selected: matches[index].confidence >= 0.9,
      value: '',
    })),
    repeatGroups: detectRepeatGroups(descriptors),
  }
}

function insertContent(value: string, mode: 'replace' | 'append' = 'replace'): InsertResult {
  if (!activeElement || !document.documentElement.contains(activeElement)) {
    return { ok: false, message: '请先点击网页中的输入框' }
  }
  try {
    const ok = fillElement(activeElement, value, mode)
    if (!ok) return { ok: false, message: '该网页组件暂不支持直接填写', activeField: activeField ?? undefined }
    activeField = toActiveField(activeElement)
    return { ok: true, message: '已插入', activeField }
  } catch {
    return { ok: false, message: '该网页组件暂不支持直接填写', activeField: activeField ?? undefined }
  }
}

chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
  if (message.type === 'SCAN_PAGE') {
    try {
      const result = scan()
      sendResponse(result)
      postToSidePanel({ type: 'SCAN_RESULT', result })
    } catch (error) {
      sendResponse({ ok: false, url: location.href, hostname: location.hostname, fields: [], repeatGroups: [], error: error instanceof Error ? error.message : '扫描失败' })
    }
    return true
  }
  if (message.type === 'FILL_FIELDS') {
    sendResponse(fillFields(message.items))
    return true
  }
  if (message.type === 'INSERT_CONTENT') {
    const result = insertContent(message.value, message.mode)
    sendResponse(result)
    postToSidePanel({ type: 'INSERT_RESULT', result })
    return true
  }
  if (message.type === 'GET_ACTIVE_FIELD') {
    sendResponse(activeField)
    return true
  }
  if (message.type === 'START_FIELD_PICKER') {
    startPicker()
    sendResponse({ ok: true })
    return true
  }
  if (message.type === 'STOP_FIELD_PICKER') {
    stopPicker()
    sendResponse({ ok: true })
    return true
  }
  return false
})
