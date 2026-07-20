import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useTeamStore, useAuthStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isMockId, uploadTeamPhoto, fileToDataUrl } from '@/lib/storage'
import { Plus, Star, Trash2, X, Image as ImageIcon } from 'lucide-react'
import type { Photo } from '@/types'
import toast from 'react-hot-toast'

export function PhotosPage() {
  const { memberRole, currentTeamId, teamColor } = useTeamStore()
  const { user } = useAuthStore()
  const isAdmin = memberRole === 'admin' || memberRole === 'coordinador'
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)

  const demoPhotos = useDemoStore(s => s.photos)
  const addDemoPhoto = useDemoStore(s => s.addPhoto)
  const toggleDemoFeatured = useDemoStore(s => s.toggleFeaturedPhoto)
  const removeDemoPhoto = useDemoStore(s => s.removePhoto)

  const [photos, setPhotos] = useState<Photo[]>(isDemo ? demoPhotos : [])
  const [loading, setLoading] = useState(!isDemo)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Photo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadPhotos() {
    if (isDemo) return
    setLoading(true)
    const { data, error } = await supabase
      .from('photos').select('*').eq('team_id', currentTeamId).order('created_at', { ascending: false })
    if (error) { toast.error('No se pudieron cargar las fotos'); setLoading(false); return }
    setPhotos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (isDemo) { setPhotos(demoPhotos); setLoading(false); return }
    loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeamId, isDemo, demoPhotos])

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    setUploading(true)
    if (isDemo) {
      const dataUrl = await fileToDataUrl(file)
      addDemoPhoto({
        id: `demo-ph-${Date.now()}`,
        team_id: 'mock-team-1',
        match_id: null,
        url: dataUrl,
        caption: null,
        uploaded_by: 'mock-user-1',
        created_at: new Date().toISOString(),
        featured: false,
      })
      toast.success('Foto agregada')
      setUploading(false)
      return
    }
    try {
      const url = await uploadTeamPhoto(file, `${currentTeamId}/photos/${Date.now()}`)
      const { error } = await supabase.from('photos').insert({
        team_id: currentTeamId, url, uploaded_by: user?.id,
      })
      if (error) throw error
      toast.success('Foto agregada')
      loadPhotos()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo subir la foto')
    }
    setUploading(false)
  }

  async function toggleFeatured(photo: Photo) {
    if (isDemo) { toggleDemoFeatured(photo.id); return }
    const { error } = await supabase.from('photos').update({ featured: !photo.featured }).eq('id', photo.id)
    if (error) { toast.error(error.message); return }
    loadPhotos()
    toast.success(photo.featured ? 'Ya no es una foto destacada' : 'Marcada como destacada — se ve en el Inicio')
  }

  async function handleRemove(photo: Photo) {
    if (isDemo) { removeDemoPhoto(photo.id); setPreview(null); return }
    const { error } = await supabase.from('photos').delete().eq('id', photo.id)
    if (error) { toast.error(error.message); return }
    setPreview(null)
    loadPhotos()
  }

  return (
    <div className="max-w-lg mx-auto pb-6">
      <PageHeader
        title="Fotos"
        subtitle={loading ? 'Cargando...' : `${photos.length} imágenes`}
        back
        action={isAdmin ? (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: teamColor, color: '#030712' }}
          >
            <Plus size={13} /> {uploading ? 'Subiendo...' : 'Subir'}
          </button>
        ) : undefined}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
      />

      {!loading && photos.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon={<ImageIcon size={40} />}
            title="Sin fotos todavía"
            description={isAdmin ? 'Subí la primera foto del club' : 'Este equipo todavía no subió fotos'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 px-1">
          {photos.map(photo => (
            <button
              key={photo.id}
              onClick={() => setPreview(photo)}
              className="aspect-square rounded-lg overflow-hidden bg-gray-900 cursor-pointer active:opacity-80 transition-opacity relative"
            >
              <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
              {photo.featured && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={e => e.target === e.currentTarget && setPreview(null)}
        >
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setPreview(null)}
                className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFeatured(preview)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={preview.featured
                      ? { background: '#fbbf2430', color: '#fbbf24' }
                      : { background: '#ffffff15', color: '#fff' }
                    }
                  >
                    <Star size={13} fill={preview.featured ? '#fbbf24' : 'none'} />
                    {preview.featured ? 'Destacada' : 'Destacar'}
                  </button>
                  <button
                    onClick={() => handleRemove(preview)}
                    className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
            <img src={preview.url} alt={preview.caption ?? ''} className="w-full rounded-2xl object-contain max-h-[75dvh]" />
          </div>
        </div>
      )}
    </div>
  )
}
