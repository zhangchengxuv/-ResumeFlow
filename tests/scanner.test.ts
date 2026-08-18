// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { detectRepeatGroups, scanPage } from '../src/content/scanner'
import { matchFields } from '../src/matcher/matcher'

describe('page scanner', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <label for="full-name">姓名</label><input id="full-name" autocomplete="name">
      <input type="tel" name="mobile_phone" placeholder="请输入手机号">
      <div><span id="major-label">主修专业</span><input aria-labelledby="major-label"></div>
      <label>最高学历<select name="education_level"><option>本科</option><option>硕士</option></select></label>
      <input type="hidden" name="tracking_token">
    `
  })

  it('extracts labels, metadata and select options while ignoring hidden fields', () => {
    const fields = scanPage()
    expect(fields).toHaveLength(4)
    expect(fields[0].editableType).toBe('input')
    expect(fields[0].selectorCandidates.length).toBeGreaterThan(0)
    expect(fields[0].label).toBe('姓名')
    expect(fields[1].placeholder).toBe('请输入手机号')
    expect(fields[2].label).toBe('主修专业')
    expect(fields[3].options).toEqual([{ value: '本科', label: '本科' }, { value: '硕士', label: '硕士' }])
  })

  it('connects scanned descriptors to resume schema paths', () => {
    const paths = matchFields(scanPage()).map((result) => result.targetField)
    expect(paths).toEqual(['basic.name', 'basic.phone', 'education.major', 'education.degree'])
  })

  it('detects repeated label patterns as repeat groups', () => {
    document.body.innerHTML = `
      <section><label>奖项名称<input name="award_name_1"></label><label>获奖时间<input name="award_time_1"></label></section>
      <section><label>奖项名称<input name="award_name_2"></label><label>获奖时间<input name="award_time_2"></label></section>
    `
    expect(detectRepeatGroups().length).toBeGreaterThanOrEqual(1)
  })
})
