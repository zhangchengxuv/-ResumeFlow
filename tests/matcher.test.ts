import { describe, expect, it } from 'vitest'
import { matchField } from '../src/matcher/matcher'
import type { FieldDescriptor } from '../src/types/fields'

const descriptor = (overrides: Partial<FieldDescriptor>): FieldDescriptor => ({
  elementId: 'field-1',
  tagName: 'input',
  editableType: 'input',
  selectorCandidates: ['input[name="field"]'],
  isVisible: true,
  isDisabled: false,
  isReadOnly: false,
  ...overrides,
})

describe('field matcher', () => {
  it('recognizes a Chinese label with high confidence', () => {
    const result = matchField(descriptor({ label: '毕业院校', placeholder: '请输入学校名称' }))
    expect(result.targetField).toBe('education.school')
    expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('uses semantic input metadata for email', () => {
    const result = matchField(descriptor({ type: 'email', name: 'contact_email', autocomplete: 'email' }))
    expect(result.targetField).toBe('basic.email')
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it('distinguishes current city from desired city with conflict words', () => {
    expect(matchField(descriptor({ label: '期望工作地点', name: 'desired_city' })).targetField).toBe('basic.targetCity')
  })

  it('leaves unrelated fields unconfirmed', () => {
    const result = matchField(descriptor({ label: '同意隐私条款', name: 'privacy_consent', type: 'checkbox' }))
    expect(result.targetField).toBe('')
    expect(result.confidence).toBeLessThan(0.6)
  })
})
