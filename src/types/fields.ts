import type { ResumeFieldPath } from './resume'

export type EditableType = 'input' | 'textarea' | 'select' | 'contenteditable' | 'aria-textbox' | 'checkable' | 'unknown'

export interface SelectOptionDescriptor {
  value: string
  label: string
}

export interface FieldDescriptor {
  elementId: string
  tagName: string
  type?: string
  label?: string
  labelText?: string
  placeholder?: string
  name?: string
  id?: string
  ariaLabel?: string
  autocomplete?: string
  nearbyText?: string
  parentText?: string
  sectionText?: string
  editableType: EditableType
  selectorCandidates: string[]
  options?: SelectOptionDescriptor[]
  isVisible: boolean
  isDisabled: boolean
  isReadOnly: boolean
}

export interface ActiveFieldDescriptor {
  elementId: string
  hostname: string
  url: string
  tagName: string
  type?: string
  id?: string
  name?: string
  placeholder?: string
  ariaLabel?: string
  labelText?: string
  nearbyText?: string
  sectionText?: string
  editableType: EditableType
  selectorCandidates: string[]
  pickedAt: string
}

export interface FieldFingerprint {
  hostname: string
  tagName: string
  type?: string
  id?: string
  name?: string
  placeholder?: string
  ariaLabel?: string
  labelText?: string
  nearbyText?: string
  sectionText?: string
  selectorCandidates: string[]
  targetField: ResumeFieldPath
  createdAt: string
  updatedAt: string
}

export interface RepeatGroup {
  id: string
  labelPattern: string[]
  fieldElementIds: string[]
  containerSelector?: string
}

export interface MatchResult {
  targetField: ResumeFieldPath | ''
  confidence: number
  reasons: string[]
  source?: 'rule' | 'mapping'
}

export interface ScannedField extends FieldDescriptor {
  match: MatchResult
  selected: boolean
  value: string
}

export interface ScanResponse {
  ok: boolean
  url: string
  hostname: string
  fields: ScannedField[]
  repeatGroups: RepeatGroup[]
  error?: string
}

export interface FillItem {
  elementId: string
  value: string
  targetField: ResumeFieldPath
}

export interface FillResponse {
  ok: boolean
  filled: number
  skipped: number
  errors: string[]
}

export interface InsertResult {
  ok: boolean
  message: string
  activeField?: ActiveFieldDescriptor
}

export type InsertMode = 'replace' | 'append'

export type ContentMessage =
  | { type: 'ACTIVE_FIELD_CHANGED'; field: ActiveFieldDescriptor | null }
  | { type: 'INSERT_CONTENT'; value: string; mode?: InsertMode }
  | { type: 'INSERT_RESULT'; result: InsertResult }
  | { type: 'START_FIELD_PICKER' }
  | { type: 'STOP_FIELD_PICKER' }
  | { type: 'FIELD_PICKED'; field: ActiveFieldDescriptor }
  | { type: 'SCAN_PAGE' }
  | { type: 'SCAN_RESULT'; result: ScanResponse }
  | { type: 'SAVE_FIELD_MAPPING'; field: ActiveFieldDescriptor; targetField: ResumeFieldPath }
  | { type: 'GET_ACTIVE_FIELD' }
  | { type: 'FILL_FIELDS'; items: FillItem[] }

export type SidePanelMessage =
  | Extract<ContentMessage, { type: 'ACTIVE_FIELD_CHANGED' | 'FIELD_PICKED' | 'SCAN_RESULT' | 'INSERT_RESULT' }>
