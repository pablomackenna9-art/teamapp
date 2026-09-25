import { format, formatDistanceToNow, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

// Alpha-blending a team's raw hex over black desaturates pale colors into a
// muddy gray/olive instead of reading as "vivid but dark" — this instead
// converts to HSL and forces a deep, richly-saturated tone that keeps the
// club's actual hue recognizable (and white text readable) no matter how
// light or pale the original color is.
function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s, l]
}

export function vividDark(hex: string, lightness: number, saturation = 55): string {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) return `hsl(220, 20%, ${lightness}%)`
  const [h] = hexToHsl(hex)
  return `hsl(${h}, ${saturation}%, ${lightness}%)`
}

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
