import type { ProductImageDto } from '@northlane/contracts';
import Image from 'next/image';

export function ProductGallery({ images }: Readonly<{ images: readonly ProductImageDto[] }>) {
  if (images.length === 0) {
    return (
      <div className="surface grid aspect-[3/4] place-items-center rounded-[2rem] text-sm uppercase tracking-[0.32em] text-[var(--muted)]">
        Northlane
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {images.map((image, index) => (
        <figure
          className={`surface relative overflow-hidden rounded-[2rem] bg-[#d8cdbd] ${
            index === 0 ? 'sm:col-span-2' : ''
          }`}
          key={image.id}
        >
          <div className={`relative ${index === 0 ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
            <Image
              alt={image.altText}
              className="object-cover"
              fill
              priority={index === 0}
              sizes={
                index === 0 ? '(max-width: 1024px) 100vw, 58vw' : '(max-width: 640px) 100vw, 28vw'
              }
              src={image.url}
            />
          </div>
        </figure>
      ))}
    </div>
  );
}
