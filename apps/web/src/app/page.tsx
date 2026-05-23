import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HomeFeaturedProducts } from '../features/catalog/home-featured-products';
import { HomeHeroSlider } from '../features/home/home-hero-slider';

export default function HomePage() {
  const categorySections: readonly {
    href: Route;
    imageUrl: string;
    name: string;
    text: string;
  }[] = [
    {
      href: '/categories/sweaters' as Route,
      imageUrl:
        'https://res.cloudinary.com/dywcuco2r/image/upload/v1756857525/devre-sweater_60d000192-042_000_e4t9mg.webp',
      name: 'Knitwear',
      text: 'Heavy knits, bomber sweaters and cleaner necklines for layering.',
    },
    {
      href: '/categories/camperas' as Route,
      imageUrl:
        'https://res.cloudinary.com/dywcuco2r/image/upload/v1756858073/devre-campera_01d000120-001_000_uj7sdo.webp',
      name: 'Outerwear',
      text: 'Technical puffers and denim jackets with sharper proportions.',
    },
    {
      href: '/categories/chombas' as Route,
      imageUrl:
        'https://res.cloudinary.com/dywcuco2r/image/upload/v1756859937/devre-chomba_06d000122-081_001_evds68.webp',
      name: 'Polos',
      text: 'Short-sleeve pieces that keep the catalog open beyond winter tailoring.',
    },
  ];

  return (
    <>
      <HomeHeroSlider />
      <HomeFeaturedProducts />
      <section className="page-shell">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <article className="surface overflow-hidden rounded-[2rem]">
            <div className="grid gap-0 md:grid-cols-[.95fr_1.05fr]">
              <div className="relative min-h-[24rem]">
                <Image
                  alt="Northlane tailoring selection"
                  className="object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  src="https://res.cloudinary.com/dywcuco2r/image/upload/v1756859496/devre-traje_03d000147-003_001_ksisx0.webp"
                />
              </div>
              <div className="p-6 md:p-8 lg:p-10">
                <p className="eyebrow">Tailoring update</p>
                <h2 className="display-title mt-5 text-5xl md:text-6xl">
                  Precision cuts with less ceremony.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-[var(--muted)]">
                  Suits, soft jackets and formal trousers shaped for daily use. The collection stays
                  formal where it matters and lighter everywhere else.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-6 text-sm font-semibold uppercase tracking-[0.14em] ![color:#fff] transition hover:bg-[var(--accent)]"
                    href="/categories/trajes"
                  >
                    Shop suits
                  </Link>
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] px-6 text-sm font-semibold uppercase tracking-[0.14em]"
                    href="/categories/sacos"
                  >
                    View jackets
                  </Link>
                </div>
              </div>
            </div>
          </article>
          <div className="grid gap-4">
            {[
              [
                'Stock-aware checkout',
                'Every selected size is guarded through the flow before payment closes.',
              ],
              [
                'Cold-season depth',
                'Outerwear, knitwear and tailoring are staged as a coherent winter edit.',
              ],
              [
                'Account continuity',
                'Orders, addresses and profile details stay organized without extra steps.',
              ],
            ].map(([title, description]) => (
              <article className="surface rounded-[1.8rem] p-6" key={title}>
                <p className="eyebrow">{title}</p>
                <p className="display-title mt-7 text-3xl leading-[1.02] md:text-4xl">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="page-shell">
        <div className="grid gap-4 md:grid-cols-3">
          {categorySections.map((section) => (
            <Link
              className="group surface overflow-hidden rounded-[1.8rem]"
              href={section.href}
              key={section.name}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  alt={section.name}
                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  src={section.imageUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,12,10,.82)] via-[rgba(13,12,10,.18)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-[var(--paper-solid)]">
                  <p className="eyebrow ![color:#F4EBDD]">{section.name}</p>
                  <p className="mt-3 text-lg leading-7">{section.text}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
