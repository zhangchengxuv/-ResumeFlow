import type { IconName } from '../components/Icon'

export type PageId = 'current' | 'resume' | 'snippets' | 'settings'

export const NAV_ITEMS: Array<{ id: PageId; label: string; icon: IconName }> = [
  { id: 'current', label: '当前页面', icon: 'scan' },
  { id: 'resume', label: '我的简历', icon: 'resume' },
  { id: 'snippets', label: '资料库', icon: 'text' },
  { id: 'settings', label: '设置', icon: 'settings' },
]
