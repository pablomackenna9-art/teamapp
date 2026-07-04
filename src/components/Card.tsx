import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  padding?: boolean
}

export function Card({ children, className = '', onClick, padding = true }: CardProps) {
  const base = `bg-gray-900 rounded-2xl border border-gray-800 ${padding ? 'p-4' : ''} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`
  return (
    <div className={base} onClick={onClick}>
      {children}
    </div>
  )
}
