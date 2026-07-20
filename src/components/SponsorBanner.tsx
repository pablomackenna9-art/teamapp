import { useTeamStore } from '@/store/authStore'

interface SponsorBannerProps {
  sectionKey?: string
  categoryId?: string | null
}

// Sponsors are assigned per category (not per club) by the platform super
// admin — each category can show a different sponsor, or none at all.
export function SponsorBanner({ sectionKey, categoryId = null }: SponsorBannerProps) {
  const categories = useTeamStore(s => s.categories)
  const activeSponsor = categoryId ? categories.find(c => c.id === categoryId)?.sponsor_url : null
  if (!activeSponsor) return null

  return (
    <div
      key={sectionKey}
      className="mx-4 rounded-2xl overflow-hidden border border-gray-800 bg-black"
      style={{ height: 110 }}
    >
      {/* object-cover so the image fills the banner edge-to-edge with no
          letterboxing — upload sponsor images already cropped to roughly
          this banner's ~4.4:1 ratio (see the size hint where it's uploaded)
          so nothing important gets cut off at the sides. */}
      <img
        src={activeSponsor}
        alt="Auspiciador"
        className="w-full h-full object-cover block"
      />
    </div>
  )
}
