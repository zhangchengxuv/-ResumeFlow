// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadResume, saveResume } from '../src/storage/resumeStorage'
import { demoResume } from '../src/storage/demoResume'

describe('local resume persistence', () => {
  beforeEach(() => localStorage.clear())

  it('loads demo data initially and persists edits across reloads', async () => {
    const initial = await loadResume()
    expect(initial.basic.name).toBe(demoResume.basic.name)
    expect(initial.snippets[0].category).toBeTruthy()
    expect(initial.snippets[0].favorite).toBeTypeOf('boolean')
    expect(initial.snippets[0].useCount).toBeTypeOf('number')
    await saveResume({ ...initial, basic: { ...initial.basic, name: '测试姓名' } })
    const reloaded = await loadResume()
    expect(reloaded.basic.name).toBe('测试姓名')
  })

  it('migrates legacy snippets without removing user data', async () => {
    const legacy = structuredClone(demoResume)
    legacy.snippets = [{ id: 'legacy-1', title: '项目介绍', content: '负责项目交付', updatedAt: '2026-01-01T00:00:00.000Z' }]
    localStorage.setItem('resumeflow.resume.v1', JSON.stringify(legacy))
    const loaded = await loadResume()
    expect(loaded.snippets[0].title).toBe('项目介绍')
    expect(loaded.snippets[0].category).toBe('project')
    expect(loaded.snippets[0].favorite).toBe(false)
    expect(loaded.snippets[0].useCount).toBe(0)
  })
})
