import { describe, expect, it } from 'vitest'
import { getRecommendedChild, recommendedChildKey } from '../src/adapters/snippetRecommendations'
import type { ActiveFieldDescriptor } from '../src/types/fields'
import type { GroupedLibraryItem } from '../src/types/resume'

const field = (labelText: string): ActiveFieldDescriptor => ({
  elementId: 'field-1',
  hostname: 'example.com',
  url: 'https://example.com/jobs',
  tagName: 'textarea',
  editableType: 'textarea',
  labelText,
  selectorCandidates: ['textarea[name="field"]'],
  pickedAt: '2026-08-18T00:00:00.000Z',
})

const projectGroup: GroupedLibraryItem = {
  id: 'project-group',
  itemType: 'group',
  category: 'project',
  title: '外骨骼康复训练方法研究',
  subtitle: '康复机器人',
  favorite: false,
  useCount: 0,
  children: [
    { id: 'child-description', key: 'description', label: '项目描述', content: '描述内容' },
    { id: 'child-responsibilities', key: 'responsibilities', label: '项目职责', content: '职责内容' },
    { id: 'child-tech', key: 'techStack', label: '技术栈', content: '技术内容' },
  ],
}

describe('library recommendations', () => {
  it('maps project responsibility fields to the responsibilities child', () => {
    expect(recommendedChildKey(field('项目职责'))).toBe('responsibilities')
    expect(getRecommendedChild(projectGroup, field('项目职责'))?.id).toBe('child-responsibilities')
  })

  it('maps tech stack fields to the techStack child', () => {
    expect(recommendedChildKey(field('技术栈'))).toBe('techStack')
    expect(getRecommendedChild(projectGroup, field('技术栈'))?.id).toBe('child-tech')
  })
})
