// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadResume, saveResume } from '../src/storage/resumeStorage'
import { demoResume } from '../src/storage/demoResume'
import type { LegacyTextSnippet, Resume } from '../src/types/resume'

describe('local resume persistence', () => {
  beforeEach(() => localStorage.clear())

  it('loads demo data as the new library schema and persists edits across reloads', async () => {
    const initial = await loadResume()
    expect(initial.basic.name).toBe(demoResume.basic.name)
    expect(initial.version).toBe(2)
    expect(initial.libraryItems[0].itemType).toBe('group')
    await saveResume({ ...initial, basic: { ...initial.basic, name: '测试姓名' } })
    const reloaded = await loadResume()
    expect(reloaded.basic.name).toBe('测试姓名')
  })

  it('migrates legacy flat snippets into plain library items without removing user data', async () => {
    const legacy = {
      ...structuredClone(demoResume),
      version: 1,
      libraryItems: undefined,
      snippets: [{ id: 'legacy-1', title: '项目介绍', content: '负责项目交付', updatedAt: '2026-01-01T00:00:00.000Z' } satisfies LegacyTextSnippet],
    } as unknown as Resume
    localStorage.setItem('resumeflow.resume.v1', JSON.stringify(legacy))
    const loaded = await loadResume()
    expect(loaded.libraryItems).toHaveLength(1)
    const item = loaded.libraryItems[0]
    expect(item.itemType).toBe('plain')
    expect(item.title).toBe('项目介绍')
    expect(item.category).toBe('project')
    expect(item.favorite).toBe(false)
    expect(item.useCount).toBe(0)
    expect(loaded.snippets).toBeUndefined()
  })
})
