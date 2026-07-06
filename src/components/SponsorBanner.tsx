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
      className="mx-4 rounded-2xl overflow-hidden border border-gray-800 bg-black flex items-center justify-center"
      style={{ height: 130 }}
    >
      {/* object-contain so the whole banner is always visible, never cropped,
          regardless of the aspect ratio the sponsor image was uploaded at. */}
      <img
        src={activeSponsor}
        alt="Auspiciador"
        className="w-full h-full object-contain block"
      />
    </div>
  )
}
