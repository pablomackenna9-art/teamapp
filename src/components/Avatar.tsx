import { initials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const cls = `${sizes[size]} rounded-full flex items-center justify-center font-semibold shrink-0 overflow-hidden ${className}`

  if (src) {
    return <img src={src} alt={name} className={cls + ' object-cover'} />
  }

  return (
    <div className={cls} style={{ background: 'var(--team-color-dim)', color: 'var(--team-color)' }}>
      {initials(name)}
    </div>
  )
}
