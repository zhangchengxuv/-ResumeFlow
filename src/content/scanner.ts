import type { EditableType, FieldDescriptor, RepeatGroup } from '../types/fields'

const FIELD_SELECTOR = [
  'input:not([type="hidden"])', 'textarea', 'select', '[contenteditable="true"]',
  '[role="textbox"]', '[role="combobox"]', '[role="radio"]', '[role="checkbox"]',
].join(',')

const cleanText = (text?: string | null) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, 180)

function getRoots(root: Document | ShadowRoot = document): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [root]
  root.querySelectorAll('*').forEach((element) => {
    if (element.shadowRoot) roots.push(...getRoots(element.shadowRoot))
  })
  return roots
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape?.(value) ?? value.replace(/["\\#.:()[\] >+~]/g, '\\$&')
}

function labelText(element: HTMLElement): string {
  const input = element as HTMLInputElement
  if (input.labels?.length) return cleanText([...input.labels].map((label) => label.textContent).join(' '))
  const wrappingLabel = element.closest('label')
  if (wrappingLabel) return cleanText(wrappingLabel.textContent)
  const id = element.id
  if (id) {
    const root = element.getRootNode() as Document | ShadowRoot
    const explicit = [...root.querySelectorAll('label')].find((label) => label.htmlFor === id)
    if (explicit) return cleanText(explicit.textContent)
  }
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    return cleanText(labelledBy.split(/\s+/).map((ref) => document.getElementById(ref)?.textContent).join(' '))
  }
  return ''
}

function nearbyText(element: HTMLElement): string {
  const pieces: string[] = []
  let sibling = element.previousElementSibling
  for (let count = 0; sibling && count < 2; count += 1, sibling = sibling.previousElementSibling) {
    pieces.unshift(cleanText(sibling.textContent))
  }
  sibling = element.nextElementSibling
  if (sibling) pieces.push(cleanText(sibling.textContent))
  return cleanText(pieces.filter(Boolean).join(' '))
}

function strippedContainerText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll(FIELD_SELECTOR).forEach((field) => field.remove())
  return cleanText(clone.textContent)
}

function parentText(element: HTMLElement): string {
  return element.parentElement ? strippedContainerText(element.parentElement) : ''
}

function sectionText(element: HTMLElement): string {
  const section = element.closest('section, fieldset, form, article, [data-section], .section, .form-section') as HTMLElement | null
  if (section) return strippedContainerText(section)
  let current = element.parentElement
  for (let depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
    const text = strippedContainerText(current)
    if (text.length > 8) return text
  }
  return ''
}

function selectorCandidates(element: HTMLElement): string[] {
  const candidates: string[] = []
  const tag = element.tagName.toLowerCase()
  if (element.id) candidates.push(`${tag}#${cssEscape(element.id)}`)
  const name = element.getAttribute('name')
  if (name) candidates.push(`${tag}[name="${cssEscape(name)}"]`)
  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) candidates.push(`${tag}[aria-label="${cssEscape(ariaLabel)}"]`)
  const placeholder = element.getAttribute('placeholder')
  if (placeholder) candidates.push(`${tag}[placeholder="${cssEscape(placeholder)}"]`)
  const autocomplete = element.getAttribute('autocomplete')
  if (autocomplete) candidates.push(`${tag}[autocomplete="${cssEscape(autocomplete)}"]`)
  const dataId = ensureElementId(element)
  candidates.push(`[data-resumeflow-id="${cssEscape(dataId)}"]`)
  return [...new Set(candidates)].slice(0, 8)
}

function editableType(element: HTMLElement): EditableType {
  if (element instanceof HTMLTextAreaElement) return 'textarea'
  if (element instanceof HTMLSelectElement) return 'select'
  if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) return 'checkable'
  if (element instanceof HTMLInputElement) return 'input'
  if (element.isContentEditable) return 'contenteditable'
  if (element.getAttribute('role') === 'textbox') return 'aria-textbox'
  return 'unknown'
}

function isVisible(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false
  const style = getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width >= 0 && rect.height >= 0
}

let nextId = 1

export function isEditableField(element: EventTarget | null): element is HTMLElement {
  return element instanceof HTMLElement && element.matches(FIELD_SELECTOR)
}

export function getFieldElements(): HTMLElement[] {
  const unique = new Set<HTMLElement>()
  for (const root of getRoots()) {
    root.querySelectorAll<HTMLElement>(FIELD_SELECTOR).forEach((element) => unique.add(element))
  }
  return [...unique]
}

export function ensureElementId(element: HTMLElement): string {
  const existing = element.dataset.resumeflowId
  if (existing) return existing
  const id = `rf-${Date.now().toString(36)}-${nextId++}`
  element.dataset.resumeflowId = id
  return id
}

export function describeField(element: HTMLElement): FieldDescriptor {
  const control = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  const label = labelText(element)
  return {
    elementId: ensureElementId(element),
    tagName: element.tagName.toLowerCase(),
    type: 'type' in control ? control.type?.toLowerCase() : element.getAttribute('role') ?? undefined,
    label: label || undefined,
    labelText: label || undefined,
    placeholder: element.getAttribute('placeholder') ?? undefined,
    name: element.getAttribute('name') ?? undefined,
    id: element.id || undefined,
    ariaLabel: element.getAttribute('aria-label') ?? undefined,
    autocomplete: element.getAttribute('autocomplete') ?? undefined,
    nearbyText: nearbyText(element) || undefined,
    parentText: parentText(element) || undefined,
    sectionText: sectionText(element) || undefined,
    editableType: editableType(element),
    selectorCandidates: selectorCandidates(element),
    options: element instanceof HTMLSelectElement
      ? [...element.options].map((option) => ({ value: option.value, label: cleanText(option.textContent) }))
      : undefined,
    isVisible: isVisible(element),
    isDisabled: 'disabled' in control ? Boolean(control.disabled) : element.getAttribute('aria-disabled') === 'true',
    isReadOnly: 'readOnly' in control ? Boolean(control.readOnly) : false,
  }
}

export function scanPage(): FieldDescriptor[] {
  return getFieldElements().map(describeField).filter((field) => field.isVisible && !field.isDisabled && !field.isReadOnly)
}

export function findFieldElement(elementId: string): HTMLElement | null {
  for (const root of getRoots()) {
    const safeId = elementId.replace(/["\\]/g, '\\$&')
    const result = root.querySelector<HTMLElement>(`[data-resumeflow-id="${safeId}"]`)
    if (result) return result
  }
  return null
}

export function detectRepeatGroups(fields = scanPage()): RepeatGroup[] {
  const groups = new Map<string, FieldDescriptor[]>()
  for (const field of fields) {
    const key = (field.sectionText || field.parentText || '').slice(0, 80)
    if (!key) continue
    const label = field.labelText || field.placeholder || field.name || field.id
    if (!label) continue
    const list = groups.get(key) ?? []
    list.push(field)
    groups.set(key, list)
  }

  const patternGroups = new Map<string, FieldDescriptor[]>()
  for (const list of groups.values()) {
    if (list.length < 2) continue
    const pattern = list.map((field) => field.labelText || field.placeholder || field.name || field.id || '').filter(Boolean)
    if (pattern.length < 2) continue
    const signature = pattern.join('>')
    patternGroups.set(signature, [...(patternGroups.get(signature) ?? []), ...list])
  }

  return [...patternGroups.entries()]
    .filter(([, list]) => list.length >= 4)
    .map(([signature, list], index) => ({
      id: `repeat-${index + 1}`,
      labelPattern: signature.split('>'),
      fieldElementIds: list.map((field) => field.elementId),
      containerSelector: list[0]?.selectorCandidates[0],
    }))
}
