import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  icon?: IconName
  children: ReactNode
}

export function Button({ variant = 'secondary', icon, children, className = '', ...props }: ButtonProps) {
  return <button className={`button button--${variant} ${className}`} {...props}>
    {icon && <Icon name={icon} />}{children}
  </button>
}
