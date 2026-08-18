import { demoResume } from './demoResume'
import { libraryItemFromLegacySnippet, normalizeLibraryItem } from './libraryMeta'
import type { LegacyTextSnippet, LibraryItem, Resume } from '../types/resume'

const STORAGE_KEY = 'resumeflow.resume.v1'

const storageAvailable = () => typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

type StoredResume = Omit<Resume, 'version' | 'libraryItems'> & {
  version?: number
  libraryItems?: LibraryItem[]
  snippets?: LegacyTextSnippet[]
}

function normalizeResume(stored: StoredResume): Resume {
  const libraryItems = stored.libraryItems?.length
    ? stored.libraryItems.map(normalizeLibraryItem)
    : (stored.snippets ?? []).map(libraryItemFromLegacySnippet)
  return {
    ...stored,
    version: 2,
    libraryItems,
    snippets: undefined,
  }
}

export async function loadResume(): Promise<Resume> {
  if (!storageAvailable()) {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeResume(JSON.parse(raw) as StoredResume) : normalizeResume(structuredClone(demoResume))
  }
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return normalizeResume((result[STORAGE_KEY] as StoredResume | undefined) ?? structuredClone(demoResume))
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
