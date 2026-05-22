import Link from 'next/link';
import { HomeFeaturedProducts } from '../features/catalog/home-featured-products';

export default function HomePage() {
  return (
    <>
      <section className="page-shell pt-8">
        <div className="surface reveal relative overflow-hidden rounded-[2.8rem] px-6 py-12 md:px-12 md:py-20">
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/25 bg-[var(--accent)]/18 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[var(--accent-cool)]/18 blur-3xl" />
          <div className="relative max-w-5xl">
            <p className="eyebrow">Winter street tailoring / Northlane 26</p>
            <h1 className="display-title mt-6 text-[clamp(4.4rem,12vw,13rem)]">
              Quiet layers. Hard routes.
            </h1>
            <div className="mt-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <p className="max-w-2xl text-base leading-8 text-[var(--muted)] md:text-xl">
                Premium apparel built around exact silhouettes, deep neutrals and a checkout flow
                designed to preserve every selected size.
              </p>
              <Link
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[var(--ink)] px-7 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--paper-solid)] transition hover:bg-[var(--accent)]"
                href="/products"
              >
                Shop the edit
              </Link>
            </div>
          </div>
        </div>
      </section>
      <HomeFeaturedProducts />
      <section className="page-shell">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Oversized essentials', 'Volume through shoulders, clean at the hem.'],
            ['Stock-aware checkout', 'Inventory reservations protect the piece you selected.'],
            ['Account timeline', 'Addresses, profile details and every order state in one lane.'],
          ].map(([title, description]) => (
            <article className="surface rounded-[1.8rem] p-6" key={title}>
              <p className="eyebrow">{title}</p>
              <p className="display-title mt-8 text-4xl">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
