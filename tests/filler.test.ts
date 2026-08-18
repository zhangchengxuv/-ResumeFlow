// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fillElement } from '../src/content/filler'

describe('form filler', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('updates native input values and dispatches framework-observable events', () => {
    document.body.innerHTML = '<input id="name" />'
    const input = document.querySelector<HTMLInputElement>('#name')!
    const events: string[] = []
    for (const type of ['input', 'change', 'blur']) input.addEventListener(type, () => events.push(type))
    expect(fillElement(input, '林知远')).toBe(true)
    expect(input.value).toBe('林知远')
    expect(events).toEqual(['input', 'change', 'blur'])
  })

  it('selects options by visible text', () => {
    document.body.innerHTML = '<select><option value="">请选择</option><option value="master">硕士</option></select>'
    const select = document.querySelector('select')!
    expect(fillElement(select, '硕士')).toBe(true)
    expect(select.value).toBe('master')
  })

  it('supports contenteditable controls', () => {
    document.body.innerHTML = '<div contenteditable="true" role="textbox"></div>'
    const editor = document.querySelector<HTMLElement>('div')!
    const inputSpy = vi.fn()
    editor.addEventListener('input', inputSpy)
    expect(fillElement(editor, '自我评价内容')).toBe(true)
    expect(editor.textContent).toBe('自我评价内容')
    expect(inputSpy).toHaveBeenCalledOnce()
  })

  it('can append to the last active value', () => {
    document.body.innerHTML = '<textarea>first</textarea>'
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea')!
    expect(fillElement(textarea, 'second', 'append')).toBe(true)
    expect(textarea.value).toBe('first\nsecond')
  })
})
