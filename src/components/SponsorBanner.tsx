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
      style={{ height: 100 }}
    >
      <img
        src={activeSponsor}
        alt="Auspiciador"
        className="w-full h-full object-cover block"
      />
    </div>
  )
}
