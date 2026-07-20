import { useEffect, useRef, useState } from 'react'
import { Plus, X, Camera, Check, Home, Heart } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SponsorBanner } from '@/components/SponsorBanner'
import { useTeamStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { useAuthStore } from '@/store/authStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { isMockId, fileToDataUrl } from '@/lib/storage'
import { mockCategories } from '@/lib/mock'
import { timeAgo } from '@/lib/utils'
import type { Post, PostType, Category } from '@/types'
import toast from 'react-hot-toast'

const POST_META: Record<PostType, { label: string; color: string; emoji: string }> = {
  notice:       { label: 'Aviso',       color: '#f59e0b', emoji: '📢' },
  citation:     { label: 'Citación',    color: '#22c55e', emoji: '📋' },
  announcement: { label: 'Comunicado',  color: '#3b82f6', emoji: '🎉' },
}

// ── Create post form (bottom sheet) ──────────────────────────────────────────
function CreatePostSheet({ teamColor, categories, defaultCategoryId, onSave, onClose }: {
  teamColor: string
  categories: Category[]
  defaultCategoryId: string | null
  onSave: (post: Omit<Post, 'id' | 'team_id' | 'created_by' | 'created_at'>) => Promise<void> | void
  onClose: () => void
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<PostType>('announcement')
  const [bgPhoto, setBgPhoto] = useState<string | null>(null)
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(defaultCategoryId)
  const [saving, setSaving] = useState(false)

  async function handlePhoto(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    const dataUrl = await fileToDataUrl(file)
    setBgPhoto(dataUrl)
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Escribí un título'); return }
    if (!content.trim()) { toast.error('Escribí el contenido'); return }
    setSaving(true)
    await onSave({ title: title.trim(), content: content.trim(), type, photo_url: bgPhoto, category_id: targetCategoryId })
    setSaving(false)
    toast.success('Publicación creada')
    onClose()
  }

  const meta = POST_META[type]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 max-h-[92dvh] sm:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-white font-bold text-lg">Nueva publicación</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-4">
          {/* Target: Inicio or a specific category */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Publicar en</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setTargetCategoryId(null)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                style={targetCategoryId === null
                  ? { background: teamColor + '25', borderColor: teamColor, color: teamColor }
                  : { background: 'transparent', borderColor: '#374151', color: '#6b7280' }
                }
              >
                <Home size={12} /> Inicio (general)
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setTargetCategoryId(cat.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={targetCategoryId === cat.id
                    ? { background: teamColor + '25', borderColor: teamColor, color: teamColor }
                    : { background: 'transparent', borderColor: '#374151', color: '#6b7280' }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-[11px] mt-1.5">
              {targetCategoryId === null
                ? 'Se va a ver en el inicio general, visible para todo el club.'
                : `Solo va a aparecer dentro de la categoría "${categories.find(c => c.id === targetCategoryId)?.name}".`}
            </p>
          </div>

          {/* Type selector */}
          <div className="flex gap-2">
            {(Object.keys(POST_META) as PostType[]).map(t => {
              const m = POST_META[t]
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all"
                  style={type === t
                    ? { background: m.color + '25', borderColor: m.color, color: m.color }
                    : { background: 'transparent', borderColor: '#374151', color: '#6b7280' }
                  }
                >
                  <span>{m.emoji}</span> {m.label}
                </button>
              )
            })}
          </div>

          {/* Photo background */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Foto de fondo (opcional)</p>
            <button
              onClick={() => photoRef.current?.click()}
              className="relative w-full rounded-2xl overflow-hidden border-2 border-dashed border-gray-700 flex items-center justify-center transition-colors hover:border-gray-500"
              style={{
                minHeight: bgPhoto ? 160 : 80,
                background: bgPhoto ? undefined : '#111827',
              }}
            >
              {bgPhoto ? (
                <>
                  <img src={bgPhoto} alt="" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                      <Camera size={14} /> Cambiar foto
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setBgPhoto(null) }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={13} />
                  </button>
                </>
              ) : (
                <span className="text-gray-500 text-sm flex items-center gap-2">
                  <Camera size={16} /> Agregar foto de fondo
                </span>
              )}
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }}
            />
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Título</p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Convocatoria del sábado..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none focus:border-current"
              style={{ '--tw-ring-color': meta.color } as React.CSSProperties}
              onFocus={e => (e.target.style.borderColor = meta.color)}
              onBlur={e => (e.target.style.borderColor = '#374151')}
            />
          </div>

          {/* Content */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contenido</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Escribí el mensaje aquí..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none resize-none"
              onFocus={e => (e.target.style.borderColor = meta.color)}
              onBlur={e => (e.target.style.borderColor = '#374151')}
            />
          </div>

          {/* Preview */}
          {(title || content) && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vista previa</p>
              <PostCard
                post={{
                  id: 'preview',
                  team_id: '',
                  created_by: '',
                  created_at: new Date().toISOString(),
                  title: title || 'Título...',
                  content: content || 'Contenido...',
                  type,
                  photo_url: bgPhoto,
                  category_id: targetCategoryId,
                }}
                categories={categories}
              />
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="px-5 pb-8 pt-3 border-t border-gray-800 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-50"
            style={{ background: teamColor, color: '#030712' }}
          >
            <Check size={16} /> {saving ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, categories, likeCount = 0, liked = false, onToggleLike }: {
  post: Post
  categories: Category[]
  likeCount?: number
  liked?: boolean
  onToggleLike?: () => void
}) {
  const meta = POST_META[post.type]
  const bgPhoto = post.photo_url
  const targetCategory = post.category_id ? categories.find(c => c.id === post.category_id) : null

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        border: `1px solid ${meta.color}30`,
        background: bgPhoto ? undefined : '#0d1117',
        minHeight: bgPhoto ? 160 : undefined,
      }}
    >
      {bgPhoto && (
        <>
          <img src={bgPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)' }} />
        </>
      )}

      <div className="relative p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-base">{meta.emoji}</span>
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest"
            style={{ background: meta.color + '30', color: meta.color, border: `1px solid ${meta.color}50` }}
          >
            {meta.label.toUpperCase()}
          </span>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#ffffff15', color: '#d1d5db' }}
          >
            {targetCategory ? targetCategory.name.toUpperCase() : 'INICIO'}
          </span>
          <span className="text-gray-500 text-[10px] ml-auto">{timeAgo(post.created_at)}</span>
        </div>
        <p className="text-white font-bold text-base leading-tight mb-1">{post.title}</p>
        <p className={`text-sm leading-relaxed ${bgPhoto ? 'text-gray-200' : 'text-gray-400'}`}>{post.content}</p>

        {onToggleLike && (
          <button
            onClick={e => { e.stopPropagation(); onToggleLike() }}
            className="flex items-center gap-1.5 mt-3 text-xs font-semibold"
            style={{ color: liked ? '#ef4444' : '#6b7280' }}
          >
            <Heart size={15} fill={liked ? '#ef4444' : 'none'} />
            {likeCount > 0 ? likeCount : 'Me gusta'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function NewsPage() {
  const { memberRole, teamColor, currentTeamId, categories, activeCategoryId, viewMode } = useTeamStore()
  const { user } = useAuthStore()
  const isAdmin = memberRole === 'admin' || memberRole === 'captain' || memberRole === 'coordinador'
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const [showCreate, setShowCreate] = useState(false)
  const activeCategories = categories.length > 0 ? categories : mockCategories

  const demoPosts = useDemoStore(s => s.posts)
  const addDemoPost = useDemoStore(s => s.addPost)
  const demoLikeCounts = useDemoStore(s => s.postLikeCounts)
  const demoLikedPostIds = useDemoStore(s => s.myLikedPostIds)
  const toggleDemoLike = useDemoStore(s => s.toggleLike)

  const [posts, setPosts] = useState<Post[]>(isDemo ? demoPosts : [])
  const [loading, setLoading] = useState(!isDemo)
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())

  async function loadLikes(postIds: string[]) {
    if (isDemo || postIds.length === 0) return
    const { data } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds)
    const counts: Record<string, number> = {}
    const mine = new Set<string>()
    for (const row of data ?? []) {
      counts[row.post_id] = (counts[row.post_id] ?? 0) + 1
      if (row.user_id === user?.id) mine.add(row.post_id)
    }
    setLikeCounts(counts)
    setLikedPostIds(mine)
  }

  async function toggleLike(postId: string) {
    if (isDemo) { toggleDemoLike(postId); return }
    if (!user) return
    const alreadyLiked = likedPostIds.has(postId)
    if (alreadyLiked) {
      setLikedPostIds(prev => { const s = new Set(prev); s.delete(postId); return s })
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 1) - 1) }))
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      setLikedPostIds(prev => new Set(prev).add(postId))
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }))
      await supabase.from('post_likes').insert({ team_id: currentTeamId, post_id: postId, user_id: user.id })
    }
  }

  async function loadPosts() {
    if (isDemo) { setPosts(demoPosts); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('team_id', currentTeamId)
      .order('created_at', { ascending: false })
    if (error) { toast.error('No se pudieron cargar las noticias'); setLoading(false); return }
    setPosts(data ?? [])
    setLoading(false)
    loadLikes((data ?? []).map(p => p.id))
  }

  useEffect(() => {
    if (isDemo) { setPosts(demoPosts); setLoading(false); return }
    loadPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeamId, isDemo, demoPosts])

  async function handleCreate(data: Omit<Post, 'id' | 'team_id' | 'created_by' | 'created_at'>) {
    if (isDemo) {
      addDemoPost({
        id: `demo-post-${Date.now()}`,
        team_id: 'mock-team-1',
        created_by: 'mock-user-1',
        created_at: new Date().toISOString(),
        ...data,
      })
      return
    }
    const { error } = await supabase.from('posts').insert({
      team_id: currentTeamId,
      created_by: user?.id,
      title: data.title,
      content: data.content,
      type: data.type,
      photo_url: data.photo_url,
      category_id: data.category_id,
    })
    if (error) { toast.error(error.message); return }
    loadPosts()
  }

  // When creating from within a category view, default the target to that category
  const defaultCategoryId = viewMode === 'category' ? activeCategoryId : null

  return (
    <div className="max-w-lg mx-auto pb-6">
      <PageHeader
        title="Noticias"
        back
        action={isAdmin ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: teamColor, color: '#030712' }}
          >
            <Plus size={13} /> Nuevo
          </button>
        ) : undefined}
      />

      <div className="mb-3">
        <SponsorBanner sectionKey="news" />
      </div>

      <div className="px-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8">Cargando...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Sin publicaciones todavía</p>
        ) : posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            categories={activeCategories}
            likeCount={isDemo ? (demoLikeCounts[post.id] ?? 0) : (likeCounts[post.id] ?? 0)}
            liked={isDemo ? demoLikedPostIds.includes(post.id) : likedPostIds.has(post.id)}
            onToggleLike={() => toggleLike(post.id)}
          />
        ))}
      </div>

      {showCreate && (
        <CreatePostSheet
          teamColor={teamColor}
          categories={activeCategories}
          defaultCategoryId={defaultCategoryId}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
