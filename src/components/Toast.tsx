import { Icon } from './Icon'

export function Toast({ message }: { message: string }) {
  if (!message) return null
  return <div className="toast" role="status"><Icon name="check" />{message}</div>
}
