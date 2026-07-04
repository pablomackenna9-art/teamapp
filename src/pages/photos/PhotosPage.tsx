import { PageHeader } from '@/components/PageHeader'

// Placeholder photos for demo
const DEMO_PHOTOS = Array.from({ length: 9 }, (_, i) => ({
  id: `ph${i}`,
  url: `https://picsum.photos/seed/team${i}/400/400`,
  caption: `Foto ${i + 1}`,
}))

export function PhotosPage() {
  return (
    <div className="max-w-lg mx-auto pb-6">
      <PageHeader title="Fotos" subtitle={`${DEMO_PHOTOS.length} imágenes`} back />

      <div className="grid grid-cols-3 gap-1 px-1">
        {DEMO_PHOTOS.map(photo => (
          <div
            key={photo.id}
            className="aspect-square rounded-lg overflow-hidden bg-gray-900 cursor-pointer active:opacity-80 transition-opacity"
          >
            <img
              src={photo.url}
              alt={photo.caption}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
