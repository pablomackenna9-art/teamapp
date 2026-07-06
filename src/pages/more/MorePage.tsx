import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trophy, Image, Bell, LogOut, ChevronRight, Settings, Camera, Pencil, Check, X, Users2, Trash2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { useAuthStore, useTeamStore } from '@/store/authStore'
import { useDemoStore } from '@/store/demoStore'
import { mockTeam } from '@/lib/mock'
import { initials } from '@/lib/utils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { uploadTeamPhoto, isMockId, fileToDataUrl } from '@/lib/storage'
import toast from 'react-hot-toast'

function MenuItem({ icon: Icon, label, color, onClick }: {
  icon: typeof Trophy; label: string; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full py-3.5 border-b border-gray-800 last:border-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '26' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <span className="flex-1 text-left text-white text-sm font-medium">{label}</span>
      <ChevronRight size={16} className="text-gray-600" />
    </button>
  )
}

function CategoryRenameRow({ cat, teamColor }: {
  cat: { id: string; name: string }
  teamColor: string
}) {
  const { renameCategory } = useTeamStore()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(cat.name)

  function save() {
    const trimmed = value.trim()
    if (!trimmed) return
    renameCategory(cat.id, trimmed)
    toast.success('Categoría renombrada')
    setEditing(false)
  }

  function cancel() {
    setValue(cat.name)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: teamColor }} />
      {editing ? (
        <>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
            className="flex-1 bg-gray-800 text-white text-sm font-medium rounded-lg px-2 py-1 outline-none border border-gray-600 focus:border-current"
            style={{ borderColor: teamColor }}
          />
          <button onClick={save} className="text-green-400 hover:text-green-300 shrink-0"><Check size={16} /></button>
          <button onClick={cancel} className="text-gray-500 hover:text-white shrink-0"><X size={14} /></button>
        </>
      ) : (
        <>
          <span className="flex-1 text-white text-sm font-medium">{cat.name}</span>
          <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-300 shrink-0">
            <Pencil size={14} />
          </button>
        </>
      )}
    </div>
  )
}

function AddCategoryRow({ teamId, isDemo }: { teamId: string | null; isDemo: boolean }) {
  const addCategory = useTeamStore(s => s.addCategory)
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const trimmed = value.trim()
    if (!trimmed) { setAdding(false); return }
    setSaving(true)

    if (isDemo) {
      addCategory({ id: `demo-cat-${Date.now()}`, team_id: 'mock-team-1', name: trimmed })
      toast.success('Categoría creada')
      setValue('')
      setAdding(false)
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('categories').insert({ team_id: teamId, name: trimmed }).select().single()

    setSaving(false)
    if (error) { toast.error(error.message); return }
    addCategory(data)
    toast.success('Categoría creada')
    setValue('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-2 w-full py-3 text-sm font-semibold text-gray-400 hover:text-white"
      >
        <Plus size={15} /> Agregar categoría
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 py-3">
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setAdding(false) }}
        placeholder="Ej: Sub-15"
        className="flex-1 bg-gray-800 text-white text-sm font-medium rounded-lg px-3 py-2 outline-none border border-gray-600"
      />
      <button onClick={save} disabled={saving} className="text-green-400 hover:text-green-300 shrink-0"><Check size={16} /></button>
      <button onClick={() => setAdding(false)} className="text-gray-500 hover:text-white shrink-0"><X size={14} /></button>
    </div>
  )
}

function TitlesManager({ teamColor }: { teamColor: string }) {
  const { categories, titles, addTitle, removeTitle } = useTeamStore()
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [tournament, setTournament] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!categoryId) { toast.error('Elegí una categoría'); return }
    if (!tournament.trim()) { toast.error('Ingresá el nombre del torneo'); return }
    setSaving(true)
    await addTitle(categoryId, tournament.trim(), parseInt(year, 10) || new Date().getFullYear())
    setSaving(false)
    setTournament('')
    toast.success('Título agregado')
  }

  if (categories.length === 0) return null

  return (
    <div className="mx-4 mb-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Títulos por categoría</p>
      <Card padding={false} className="p-3">
        {titles.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {[...titles].sort((a, b) => b.year - a.year).map(t => {
              const cat = categories.find(c => c.id === t.category_id)
              return (
                <div key={t.id} className="flex items-center gap-2 text-xs bg-gray-800/50 rounded-lg px-3 py-2">
                  <Trophy size={12} style={{ color: '#fbbf24' }} />
                  <span className="text-gray-300 font-semibold uppercase w-16 truncate">{cat?.name ?? '—'}</span>
                  <span className="text-gray-400 flex-1 truncate">{t.tournament} {t.year}</span>
                  <button onClick={() => removeTitle(t.id)} className="text-gray-600 hover:text-red-400 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              value={tournament}
              onChange={e => setTournament(e.target.value)}
              placeholder="Torneo (ej: Apertura)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm outline-none min-w-0"
            />
            <input
              value={year}
              onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Año"
              className="w-20 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm outline-none shrink-0"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
            style={{ background: teamColor + '20', color: teamColor }}
          >
            <Plus size={14} /> Agregar título
          </button>
        </div>
      </Card>
    </div>
  )
}

function SponsorsManager({ teamColor, teamName, teamId, isDemo }: {
  teamColor: string; teamName: string; teamId: string | null; isDemo: boolean
}) {
  const setTeamSponsor = useTeamStore(s => s.setTeamSponsor)
  const activeSponsorFromStore = useTeamStore(s => s.teamSponsorUrl)

  // Demo keeps a small gallery to pick from; real teams manage a single image directly.
  const demoSponsors = useDemoStore(s => s.sponsors)
  const addDemoSponsor = useDemoStore(s => s.addSponsor)
  const removeDemoSponsor = useDemoStore(s => s.removeSponsor)

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAddDemo(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    setUploading(true)
    const dataUrl = await fileToDataUrl(file)
    addDemoSponsor(dataUrl)
    toast.success('Auspiciador agregado a la galería')
    setUploading(false)
  }

  async function handleUploadReal(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    if (!teamId) return
    setUploading(true)
    try {
      const url = await uploadTeamPhoto(file, `${teamId}/sponsor`)
      const { error } = await supabase.from('teams').update({ sponsor_url: url }).eq('id', teamId)
      if (error) throw error
      setTeamSponsor(url)
      toast.success('Auspiciador actualizado')
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo subir el auspiciador')
    }
    setUploading(false)
  }

  async function handleRemoveReal() {
    if (!teamId) return
    const { error } = await supabase.from('teams').update({ sponsor_url: null }).eq('id', teamId)
    if (error) { toast.error(error.message); return }
    setTeamSponsor(null)
    toast.success('Auspiciador quitado')
  }

  return (
    <div className="mx-4 mb-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Auspiciador de {teamName}</p>
      <Card padding={false} className="p-3">
        <p className="text-gray-500 text-xs mb-3">
          Elegí qué auspiciador se muestra en <span className="text-gray-300">todas las secciones y categorías</span> de este club. Se mantiene fijo hasta que lo cambies.
        </p>
        <p className="text-gray-600 text-[11px] mb-3">
          Medida recomendada: 1200×300px (banner horizontal), logo centrado — así se ve completo y sin recortes.
        </p>

        {activeSponsorFromStore && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Activo actualmente</p>
            <div className="rounded-xl overflow-hidden border-2 bg-black flex items-center justify-center" style={{ borderColor: teamColor, height: 90 }}>
              <img src={activeSponsorFromStore} alt="Auspiciador activo" className="w-full h-full object-contain" />
            </div>
          </div>
        )}

        {isDemo && demoSponsors.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {demoSponsors.map((url, i) => {
              const isActive = url === activeSponsorFromStore
              return (
                <button
                  key={i}
                  onClick={() => setTeamSponsor(url)}
                  className="relative rounded-xl overflow-hidden border-2 aspect-square"
                  style={{ borderColor: isActive ? teamColor : '#1f2937' }}
                >
                  <img src={url} alt={`Auspiciador ${i + 1}`} className="w-full h-full object-cover" />
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Check size={18} color={teamColor} />
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); removeDemoSponsor(i) }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white"
                  >
                    <Trash2 size={10} />
                  </button>
                </button>
              )
            })}
          </div>
        )}

        {activeSponsorFromStore && (
          <button
            onClick={() => isDemo ? setTeamSponsor(null) : handleRemoveReal()}
            className="w-full mb-2 py-2 rounded-xl text-xs font-semibold text-gray-500 border border-gray-800"
          >
            Quitar auspiciador de este club
          </button>
        )}

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: teamColor + '20', color: teamColor }}
        >
          <Plus size={14} /> {uploading ? 'Subiendo...' : (isDemo ? 'Subir nueva imagen' : (activeSponsorFromStore ? 'Cambiar imagen' : 'Subir imagen'))}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (!f) return
            isDemo ? handleAddDemo(f) : handleUploadReal(f)
          }}
        />
      </Card>
    </div>
  )
}

export function MorePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { signOut } = useAuthStore()
  const { user } = useAuthStore()
  const { teamColor, teamLogoUrl, teamName, categories, currentTeamId, setTeamLogo, memberRole, isPlatformAdminPreview } = useTeamStore()
  const [uploading, setUploading] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [checkedAdmin, setCheckedAdmin] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  // Only the club's coordinador (or the platform super admin) manages settings —
  // captain/dt/player roles can no longer see or edit team configuration.
  const isDemo = !isSupabaseConfigured || isMockId(currentTeamId)
  const isAdmin = memberRole === 'admin' || memberRole === 'coordinador' || isPlatformAdmin

  useEffect(() => {
    async function checkPlatformAdmin() {
      if (isDemo) { setIsPlatformAdmin(isPlatformAdminPreview); setCheckedAdmin(true); return }
      if (!user) { setIsPlatformAdmin(false); setCheckedAdmin(true); return }
      const { data } = await supabase
        .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
      setIsPlatformAdmin(!!data)
      setCheckedAdmin(true)
    }
    checkPlatformAdmin()
  }, [user, isDemo, isPlatformAdminPreview])

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Seleccioná una imagen'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }

    if (!isSupabaseConfigured || isMockId(currentTeamId)) {
      // Demo team — persist as base64 in the local demo store (no real Storage backend)
      setUploading(true)
      const dataUrl = await fileToDataUrl(file)
      setTeamLogo(dataUrl)
      toast.success('Logo del equipo actualizado')
      setUploading(false)
      return
    }

    setUploading(true)
    try {
      const url = await uploadTeamPhoto(file, `${currentTeamId}/logo`)
      const { error } = await supabase.from('teams').update({ logo_url: url }).eq('id', currentTeamId)
      if (error) throw error
      setTeamLogo(url)
      toast.success('Logo del equipo actualizado')
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo subir el logo')
    }
    setUploading(false)
  }

  if (!checkedAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-800 rounded-full animate-spin" style={{ borderTopColor: teamColor }} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto pb-6">
        <PageHeader title="Configuración" back />
        <div className="px-4 mt-10">
          <EmptyState
            icon={<span className="text-5xl">🔒</span>}
            title="Sin acceso"
            description="Solo el coordinador del equipo puede ver la configuración."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-6">
      <PageHeader title="Configuración" back />

      {/* Team card with prominent logo upload */}
      <div className="mx-4 mb-4">
        <div
          className="rounded-2xl p-5 flex flex-col items-center gap-4"
          style={{ background: teamColor + '15', border: `1px solid ${teamColor}30` }}
        >
          {/* Logo — large and central */}
          <div className="relative">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden border-2"
              style={{ borderColor: teamColor + '80', background: teamColor + '20' }}
            >
              {teamLogoUrl ? (
                <img src={teamLogoUrl} alt={teamName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black" style={{ color: teamColor }}>
                  {initials(teamName || mockTeam.name)}
                </span>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => logoRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-950 shadow-lg"
                style={{ background: teamColor }}
              >
                {uploading
                  ? <span className="w-3 h-3 border border-gray-950 border-t-transparent rounded-full animate-spin" />
                  : <Camera size={13} color="#030712" />
                }
              </button>
            )}
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-lg">{teamName || mockTeam.name}</p>
            <p className="text-gray-500 text-sm">/{slug}</p>
          </div>

          {isAdmin && (
            <button
              onClick={() => logoRef.current?.click()}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ background: teamColor + '30', color: teamColor, border: `1px solid ${teamColor}50` }}
            >
              <Camera size={14} />
              {teamLogoUrl ? 'Cambiar logo del equipo' : 'Subir logo del equipo'}
            </button>
          )}
        </div>

        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
        />
      </div>

      {/* Categories — coordinador can rename existing and add new ones */}
      {isAdmin && (
        <div className="mx-4 mb-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Categorías</p>
          <Card padding={false} className="px-4">
            {categories.map(cat => (
              <CategoryRenameRow key={cat.id} cat={cat} teamColor={teamColor} />
            ))}
            <AddCategoryRow teamId={currentTeamId} isDemo={isDemo} />
          </Card>
          {categories.length === 0 && (
            <p className="text-gray-600 text-xs mt-2 px-1">
              Este equipo todavía no tiene categorías — agregá la primera arriba para empezar a cargar el plantel, partidos y fixture.
            </p>
          )}
        </div>
      )}

      {/* Sponsors — platform super admin only */}
      {isPlatformAdmin && (
        <SponsorsManager
          teamColor={teamColor}
          teamName={teamName || mockTeam.name}
          teamId={currentTeamId}
          isDemo={isDemo}
        />
      )}

      <div className="px-4 flex flex-col gap-3">
        <Card padding={false} className="px-4">
          <MenuItem icon={Trophy} label="Tabla de posiciones" color="#f59e0b" onClick={() => navigate(`/team/${slug}/standings`)} />
          <MenuItem icon={Image} label="Galería de fotos" color="#3b82f6" onClick={() => navigate(`/team/${slug}/photos`)} />
          <MenuItem icon={Bell} label="Noticias y avisos" color={teamColor} onClick={() => navigate(`/team/${slug}/news`)} />
          <MenuItem icon={Settings} label="Estadísticas del equipo" color="#6b7280" onClick={() => navigate(`/team/${slug}/stats`)} />
        </Card>
      </div>

      {/* Titles — coordinador sets the club's trophy history per category */}
      <TitlesManager teamColor={teamColor} />

      <div className="px-4 flex flex-col gap-3">
        <Card padding={false} className="px-4">
          <MenuItem icon={Users2} label="Volver a todos los equipos" color="#a855f7" onClick={() => navigate('/teams')} />
          <MenuItem icon={LogOut} label="Cerrar sesión" color="#ef4444"
            onClick={() => { signOut(); navigate('/login') }} />
        </Card>
      </div>
    </div>
  )
}
