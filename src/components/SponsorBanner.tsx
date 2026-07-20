import { useTeamStore } from '@/store/authStore'

interface SponsorBannerProps {
  sectionKey?: string
}

// A single "active" sponsor is assigned per club by the platform super admin
// and shows everywhere (every category, every section) until changed —
// no automatic rotation. All banners render at the same standard size.
export function SponsorBanner({ sectionKey }: SponsorBannerProps) {
  const activeSponsor = useTeamStore(s => s.teamSponsorUrl)
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
