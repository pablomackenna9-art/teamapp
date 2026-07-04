import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'team'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-gray-800 text-gray-300',
  success: 'bg-green-900/50 text-green-400',
  warning: 'bg-yellow-900/50 text-yellow-400',
  danger: 'bg-red-900/50 text-red-400',
  info: 'bg-blue-900/50 text-blue-400',
  team: '',
}

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const style = variant === 'team'
    ? { background: 'var(--team-color-dim)', color: 'var(--team-color)' }
    : undefined

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}
      style={style}
    >
      {children}
    </span>
  )
}
