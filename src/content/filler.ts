import type { FillItem, FillResponse, InsertMode } from '../types/fields'
import { findFieldElement } from './scanner'

type ValueControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function dispatchEvents(element: HTMLElement, value = ''): void {
  element.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }))
  element.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  element.dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }))
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) setter.call(element, value)
  else element.value = value
}

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s\-_]/g, '')
}

function setSelectValue(element: HTMLSelectElement, value: string): boolean {
  const target = normalized(value)
  const option = [...element.options].find((item) =>
    normalized(item.value) === target || normalized(item.textContent ?? '') === target ||
    normalized(item.textContent ?? '').includes(target) || target.includes(normalized(item.textContent ?? '')),
  )
  if (!option) return false
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  setter?.call(element, option.value)
  return true
}

function setCheckable(element: HTMLInputElement, value: string): boolean {
  const label = element.labels?.[0]?.textContent ?? element.value
  const shouldCheck = normalized(label).includes(normalized(value)) || normalized(element.value) === normalized(value)
  if (!shouldCheck && element.type === 'radio') return false
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set
  setter?.call(element, shouldCheck || ['true', 'yes', '1', '是'].includes(normalized(value)))
  return true
}

function nextValue(current: string, value: string, mode: InsertMode): string {
  return mode === 'append' && current ? `${current}\n${value}` : value
}

function setEditableContent(element: HTMLElement, value: string, mode: InsertMode): void {
  const content = nextValue(element.textContent ?? '', value, mode)
  element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, composed: true, inputType: 'insertText', data: value }))
  element.textContent = content
}

export function fillElement(element: HTMLElement, value: string, mode: InsertMode = 'replace'): boolean {
  element.focus({ preventScroll: true })
  if (element instanceof HTMLSelectElement) {
    if (!setSelectValue(element, value)) return false
  } else if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) {
    if (!setCheckable(element, value)) return false
  } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, nextValue(element.value, value, mode))
  } else if (element.isContentEditable || element.getAttribute('role') === 'textbox') {
    setEditableContent(element, value, mode)
  } else {
    const control = element as ValueControl
    if (!('value' in control)) return false
    control.value = nextValue(String(control.value ?? ''), value, mode)
  }
  dispatchEvents(element, value)
  return true
}

export function fillFields(items: FillItem[]): FillResponse {
  let filled = 0
  let skipped = 0
  const errors: string[] = []
  for (const item of items) {
    const element = findFieldElement(item.elementId)
    if (!element || !item.value) {
      skipped += 1
      continue
    }
    try {
      if (fillElement(element, item.value)) filled += 1
      else skipped += 1
    } catch (error) {
      skipped += 1
      errors.push(error instanceof Error ? error.message : '未知填充错误')
    }
  }
  return { ok: errors.length === 0, filled, skipped, errors }
}
