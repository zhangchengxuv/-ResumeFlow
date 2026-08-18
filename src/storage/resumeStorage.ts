import { demoResume } from './demoResume'
import { normalizeSnippet } from './snippetMeta'
import type { Resume } from '../types/resume'

const STORAGE_KEY = 'resumeflow.resume.v1'

const storageAvailable = () => typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

export async function loadResume(): Promise<Resume> {
  const normalizeResume = (resume: Resume): Resume => ({
    ...resume,
    snippets: (resume.snippets ?? []).map(normalizeSnippet),
  })
  if (!storageAvailable()) {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeResume(JSON.parse(raw) as Resume) : normalizeResume(structuredClone(demoResume))
  }
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return normalizeResume((result[STORAGE_KEY] as Resume | undefined) ?? structuredClone(demoResume))
}

export async function saveResume(resume: Resume): Promise<void> {
  const next = { ...resume, updatedAt: new Date().toISOString() }
  if (!storageAvailable()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: next })
}

export async function resetResume(): Promise<Resume> {
  const next = structuredClone(demoResume)
  await saveResume(next)
  return next
}
