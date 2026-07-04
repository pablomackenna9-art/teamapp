import { format, formatDistanceToNow, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string) {
  return format(new Date(date), "dd 'de' MMMM, yyyy", { locale: es })
}

export function formatShortDate(date: string) {
  return format(new Date(date), 'dd MMM', { locale: es })
}

export function formatDateTime(date: string) {
  return format(new Date(date), "dd MMM · HH:mm", { locale: es })
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function isUpcoming(date: string) {
  return isAfter(new Date(date), new Date())
}

export function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function scoreLabel(home: number | null, away: number | null) {
  if (home === null || away === null) return null
  return `${home} - ${away}`
}

export function getResultBadge(home: number | null, away: number | null): 'W' | 'D' | 'L' | null {
  if (home === null || away === null) return null
  if (home > away) return 'W'
  if (home === away) return 'D'
  return 'L'
}
