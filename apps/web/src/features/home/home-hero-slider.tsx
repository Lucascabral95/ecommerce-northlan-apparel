'use client';

import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type HeroSlide = Readonly<{
  ctaHref: Route;
  ctaLabel: string;
  description: string;
  eyebrow: string;
  imageUrl: string;
  title: string;
}>;

const heroSlides: readonly HeroSlide[] = [
  {
    ctaHref: '/categories/sobretodos' as Route,
    ctaLabel: 'Shop outerwear',
    description:
      'Structured wool-like coats, restrained palettes and silhouettes built for the coldest city routes.',
    eyebrow: 'Winter editorial / Outerwear',
    imageUrl:
      'https://res.cloudinary.com/dywcuco2r/image/upload/v1756858234/devre-sobretodo_80d000032-002_001_vtgggg.webp',
    title: 'Sharper layers for long winter lines.',
  },
  {
    ctaHref: '/categories/sacos' as Route,
    ctaLabel: 'See tailoring',
    description:
      'Modern soft tailoring with textured fabrics, dark neutrals and pieces designed to move from office to night.',
    eyebrow: 'Tailoring / Soft structure',
    imageUrl:
      'https://res.cloudinary.com/dywcuco2r/image/upload/v1756858868/devre-saco_02d000177-081_000_u41a7v.webp',
    title: 'Formal cuts without the old uniform feel.',
  },
  {
    ctaHref: '/categories/sweaters' as Route,
    ctaLabel: 'Explore knitwear',
    description:
      'Premium knits, bomber cardigans and textured sweaters calibrated for layering through every hour of the day.',
    eyebrow: 'Knitwear / Daily depth',
    imageUrl:
      'https://res.cloudinary.com/dywcuco2r/image/upload/v1756857752/devre-sweater_60d000169-001_000_orrbpo.webp',
    title: 'Soft volume, exact texture, darker tone.',
  },
  {
    ctaHref: '/categories/camperas' as Route,
    ctaLabel: 'Open the edit',
    description:
      'Technical puffers and washed denim jackets that anchor the collection with utility and lighter motion.',
    eyebrow: 'Transit / Utility layers',
    imageUrl:
      'https://res.cloudinary.com/dywcuco2r/image/upload/v1756858186/devre-campera_01d000164-002_000_hnusz1.webp',
    title: 'Urban jackets tuned for movement and weight.',
  },
] as const;

export function HomeHeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeSlide = heroSlides[activeIndex] ?? heroSlides[0];

  if (!activeSlide) {
    return null;
  }

  return (
    <section className="page-shell pt-6">
      <div className="reveal overflow-hidden rounded-[2.2rem] border border-[var(--line)] bg-[rgba(17,15,12,.12)]">
        <div className="grid min-h-[74vh] lg:grid-cols-[1.25fr_.75fr]">
          <div className="relative min-h-[56vh] lg:min-h-[74vh]">
            <Image
              alt={activeSlide.title}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 68vw"
              src={activeSlide.imageUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(16,14,11,.68)] via-[rgba(16,14,11,.22)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 lg:p-10">
              <p className="eyebrow ![color:#F4EBDD] [text-shadow:0_2px_12px_rgba(0,0,0,.45)]">
                {activeSlide.eyebrow}
              </p>
              <h1 className="display-title mt-5 max-w-3xl text-[clamp(3.4rem,8vw,8.4rem)] text-[var(--paper-solid)]">
                {activeSlide.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[rgba(248,242,231,.82)] md:text-lg">
                {activeSlide.description}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--paper-solid)] px-6 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition hover:bg-white"
                  href={activeSlide.ctaHref}
                >
                  {activeSlide.ctaLabel}
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-[rgba(17,15,12,.46)] px-6 text-sm font-semibold uppercase tracking-[0.14em] ![color:#fff] shadow-[0_10px_30px_rgba(0,0,0,.18)] backdrop-blur-md transition hover:bg-[rgba(255,255,255,.16)] hover:![color:#fff]"
                  href="/products"
                >
                  View all products
                </Link>
              </div>
            </div>
          </div>
          <div className="surface flex flex-col justify-between gap-8 rounded-none border-0 p-6 md:p-8 lg:p-10">
            <div>
              <p className="eyebrow">Current sequence</p>
              <div className="mt-5 grid gap-3">
                {heroSlides.map((slide, index) => (
                  <button
                    className={`cursor-pointer rounded-[1rem] border px-4 py-4 text-left transition ${
                      index === activeIndex
                        ? 'border-[rgba(21,19,15,.48)] bg-[rgba(255,249,242,.82)]'
                        : 'border-transparent bg-[rgba(255,249,242,.46)] hover:border-[var(--line)] hover:bg-[rgba(255,249,242,.7)]'
                    }`}
                    key={slide.title}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">{slide.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{slide.eyebrow}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 border-t border-[var(--line)] pt-6 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Metric label="Pieces live" value="80+" />
              <Metric label="Core fits" value="4" />
              <Metric label="Focused categories" value="10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="display-title text-4xl">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
    </div>
  );
}
