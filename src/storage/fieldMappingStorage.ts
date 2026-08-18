import type { ActiveFieldDescriptor, FieldDescriptor, FieldFingerprint } from '../types/fields'
import type { ResumeFieldPath } from '../types/resume'

const STORAGE_KEY = 'resumeflow.fieldMappings.v1'

export type DomainMappings = Record<string, FieldFingerprint[]>

const storageAvailable = () => typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

const same = (left?: string, right?: string) =>
  Boolean(left && right && left.toLocaleLowerCase().trim() === right.toLocaleLowerCase().trim())

function scoreFingerprint(field: FieldDescriptor, mapping: FieldFingerprint): number {
  let score = 0
  if (same(field.tagName, mapping.tagName)) score += 0.12
  if (same(field.type, mapping.type)) score += 0.08
  if (same(field.id, mapping.id)) score += 0.2
  if (same(field.name, mapping.name)) score += 0.18
  if (same(field.placeholder, mapping.placeholder)) score += 0.14
  if (same(field.ariaLabel, mapping.ariaLabel)) score += 0.14
  if (same(field.labelText ?? field.label, mapping.labelText)) score += 0.22
  if (same(field.nearbyText, mapping.nearbyText)) score += 0.08
  if (same(field.sectionText, mapping.sectionText)) score += 0.08
  if (field.selectorCandidates.some((selector) => mapping.selectorCandidates.includes(selector))) score += 0.12
  return Math.min(score, 0.99)
}

export function fingerprintFromActiveField(field: ActiveFieldDescriptor, targetField: ResumeFieldPath): FieldFingerprint {
  const now = new Date().toISOString()
  return {
    hostname: field.hostname,
    tagName: field.tagName,
    type: field.type,
    id: field.id,
    name: field.name,
    placeholder: field.placeholder,
    ariaLabel: field.ariaLabel,
    labelText: field.labelText,
    nearbyText: field.nearbyText,
    sectionText: field.sectionText,
    selectorCandidates: field.selectorCandidates,
    targetField,
    createdAt: now,
    updatedAt: now,
  }
}

export async function loadFieldMappings(): Promise<DomainMappings> {
  if (!storageAvailable()) return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as DomainMappings
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as DomainMappings | undefined) ?? {}
}

export async function saveFieldMappings(mappings: DomainMappings): Promise<void> {
  if (!storageAvailable()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
    return
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: mappings })
}

export async function saveFieldMapping(field: ActiveFieldDescriptor, targetField: ResumeFieldPath): Promise<FieldFingerprint> {
  const mappings = await loadFieldMappings()
  const next = fingerprintFromActiveField(field, targetField)
  const domain = mappings[field.hostname] ?? []
  const existingIndex = domain.findIndex((item) =>
    item.targetField === targetField &&
    (same(item.id, next.id) || same(item.name, next.name) || same(item.labelText, next.labelText)),
  )
  const domainNext = [...domain]
  if (existingIndex >= 0) {
    domainNext[existingIndex] = { ...domainNext[existingIndex], ...next, createdAt: domainNext[existingIndex].createdAt }
  } else {
    domainNext.unshift(next)
  }
  mappings[field.hostname] = domainNext.slice(0, 80)
  await saveFieldMappings(mappings)
  return mappings[field.hostname][existingIndex >= 0 ? existingIndex : 0]
}

export function applyFieldMappings(fields: FieldDescriptor[], mappings: DomainMappings, hostname: string) {
  const domain = mappings[hostname] ?? []
  return fields.map((field) => {
    const best = domain
      .map((mapping) => ({ mapping, score: scoreFingerprint(field, mapping) }))
      .sort((a, b) => b.score - a.score)[0]
    if (!best || best.score < 0.65) return undefined
    return {
      targetField: best.mapping.targetField,
      confidence: Math.max(best.score, 0.9),
      reasons: ['根据历史设置匹配'],
      source: 'mapping' as const,
    }
  })
}
