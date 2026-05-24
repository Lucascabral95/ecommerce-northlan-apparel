import type { ProductDto } from '@northlane/contracts';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '../../shared/format';

export function ProductCard({ product }: Readonly<{ product: ProductDto }>) {
  const image = product.images.find((candidate) => candidate.isPrimary) ?? product.images[0];

  return (
    <article className="group reveal surface overflow-hidden rounded-[1.8rem] p-3">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] bg-[#d6ccb9]">
          {image ? (
            <Image
              alt={image.altText}
              className="object-cover transition duration-700 group-hover:scale-[1.045]"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              src={image.url}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm uppercase tracking-[0.25em] text-[var(--muted)]">
              Northlane
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {product.isNewArrival ? <Badge>New</Badge> : null}
            {product.isFeatured ? <Badge>Featured</Badge> : null}
          </div>
        </div>
        <div className="px-2 pb-2 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {product.brand} / {product.categoryName}
          </p>
          <h2 className="mt-2 text-lg font-semibold">{product.title}</h2>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-semibold">{formatMoney(product.price, product.currency)}</span>
            {product.compareAtPrice ? (
              <span className="text-sm text-[var(--muted)] line-through">
                {formatMoney(product.compareAtPrice, product.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

function Badge({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <span className="rounded-full border border-white/35 bg-black/70 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white">
      {children}
    </span>
  );
}
