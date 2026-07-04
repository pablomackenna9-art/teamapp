import { supabase } from '@/lib/supabase'

const BUCKET = 'team-photos'

function extensionOf(file: File) {
  const fromName = file.name.split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return file.type.split('/').pop() ?? 'jpg'
}

export async function uploadTeamPhoto(file: File, path: string): Promise<string> {
  const fullPath = `${path}.${extensionOf(file)}`
  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, {
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
  // Cache-bust so the new image shows immediately instead of a stale CDN copy
  return `${data.publicUrl}?t=${Date.now()}`
}

export function isMockId(id: string | null | undefined) {
  return !id || id.startsWith('mock-') || /^p\d+$/.test(id) || /^cat-/.test(id)
}

// Demo mode has no real storage backend — persist images as base64 data URLs
// in localStorage (via the demo store) so they survive reloads/logout.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
