import { Button } from './Button'
import { Icon } from './Icon'

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state">
    <div className="empty-state__icon"><Icon name="scan" size={20} /></div>
    <h2>{title}</h2><p>{description}</p>
    {action && onAction && <Button icon="refresh" onClick={onAction}>{action}</Button>}
  </div>
}
