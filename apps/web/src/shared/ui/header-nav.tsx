'use client';

import type { CategoryDto } from '@northlane/contracts';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCategories } from '../../features/catalog/catalog-hooks';
import { useAuthStore } from '../../features/auth/auth-store';

type NavKey = 'categories' | 'orders' | 'shop' | null;

type QuickLinkItem = Readonly<{
  description: string;
  href: Route;
  label: string;
}>;

const shopLinks: readonly QuickLinkItem[] = [
  {
    description: 'The full product directory with filters, sorting and pagination.',
    href: '/products',
    label: 'All products',
  },
  {
    description: 'A tighter product edit focused on the latest pieces in the catalog.',
    href: '/products?sortBy=newest' as Route,
    label: 'New arrivals',
  },
  {
    description: 'The current winter selection across tailoring, outerwear and knits.',
    href: '/categories/sweaters' as Route,
    label: 'Winter edit',
  },
  {
    description: 'Formal layers and softer structure for daily tailored outfits.',
    href: '/categories/sacos' as Route,
    label: 'Tailoring',
  },
] as const;

const guestOrderLinks: readonly QuickLinkItem[] = [
  {
    description: 'Sign in to view your order timeline, delivery progress and past purchases.',
    href: '/login',
    label: 'Sign in to manage orders',
  },
  {
    description: 'Review saved addresses and account details before your next checkout.',
    href: '/account/addresses',
    label: 'Saved addresses',
  },
] as const;

const signedInOrderLinks: readonly QuickLinkItem[] = [
  {
    description: 'See every order, its current status and the items you already purchased.',
    href: '/account/orders',
    label: 'Order history',
  },
  {
    description: 'Update profile details that support future checkouts and delivery notices.',
    href: '/account/profile',
    label: 'Profile details',
  },
  {
    description: 'Review your shipping addresses before starting a new checkout.',
    href: '/account/addresses',
    label: 'Delivery addresses',
  },
] as const;

export function HeaderNav() {
  const [activePanel, setActivePanel] = useState<NavKey>(null);
  const categoriesQuery = useCategories();
  const user = useAuthStore((state) => state.user);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryGroups = useMemo(() => buildCategoryGroups(categoriesQuery.data ?? []), [categoriesQuery.data]);
  const orderLinks = user ? signedInOrderLinks : guestOrderLinks;

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

  function openPanel(panel: Exclude<NavKey, null>) {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActivePanel(panel);
  }

  function scheduleClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      setActivePanel(null);
      closeTimeoutRef.current = null;
    }, 160);
  }

  return (
    <div
      className="relative hidden md:block"
      onPointerEnter={() => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
      }}
      onPointerLeave={scheduleClose}
    >
      <nav className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em]">
        <NavTrigger
          active={activePanel === 'shop'}
          label="Shop"
          onPointerEnter={() => openPanel('shop')}
        />
        <NavTrigger
          active={activePanel === 'categories'}
          label="Categories"
          onPointerEnter={() => openPanel('categories')}
        />
        <NavTrigger
          active={activePanel === 'orders'}
          label="Orders"
          onPointerEnter={() => openPanel('orders')}
        />
      </nav>
      <div className="pointer-events-none absolute left-1/2 top-full z-50 w-[min(76rem,calc(100vw-5rem))] -translate-x-1/2 pt-2">
        {activePanel ? (
          <div className="pointer-events-auto grid gap-6 rounded-[1.6rem] border border-[rgba(21,19,15,.12)] bg-[var(--paper-solid)] p-5 shadow-[0_24px_60px_rgba(22,19,15,.16)]">
            {activePanel === 'shop' ? (
              <QuickLinksPanel
                eyebrow="Shop by intent"
                links={shopLinks}
                summary="Enter the catalog through the full directory or take a narrower route into the current edit."
              />
            ) : null}
            {activePanel === 'orders' ? (
              <QuickLinksPanel
                eyebrow={user ? 'Your account lane' : 'Account access'}
                links={orderLinks}
                summary={
                  user
                    ? 'Your account keeps orders, addresses and profile details in one place.'
                    : 'Order history and account tools become available after sign-in.'
                }
              />
            ) : null}
            {activePanel === 'categories' ? (
              <CategoriesPanel
                categoryGroups={categoryGroups}
                isLoading={categoriesQuery.isLoading}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NavTrigger({
  active,
  label,
  onPointerEnter,
}: Readonly<{
  active: boolean;
  label: string;
  onPointerEnter: () => void;
}>) {
  return (
    <button
      className={`cursor-pointer rounded-full px-4 py-2 transition ${
        active ? 'bg-[var(--paper-solid)] text-[var(--ink)] shadow-[0_10px_24px_rgba(21,19,15,.08)]' : 'text-[var(--ink)] hover:bg-[rgba(255,248,240,.95)]'
      }`}
      onFocus={onPointerEnter}
      onPointerEnter={onPointerEnter}
      type="button"
    >
      {label}
    </button>
  );
}

function QuickLinksPanel({
  eyebrow,
  links,
  summary,
}: Readonly<{
  eyebrow: string;
  links: readonly QuickLinkItem[];
  summary: string;
}>) {
  return (
    <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <p className="display-title mt-4 text-4xl leading-[0.96]">Move through the catalog with context.</p>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{summary}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            className="rounded-[1.2rem] border border-[rgba(21,19,15,.1)] bg-[#fffaf2] px-4 py-4 transition hover:bg-white"
            href={link.href}
            key={link.label}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{link.label}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoriesPanel({
  categoryGroups,
  isLoading,
}: Readonly<{
  categoryGroups: readonly CategoryGroup[];
  isLoading: boolean;
}>) {
  return (
    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
      <div>
        <p className="eyebrow">Catalog map</p>
        <p className="display-title mt-4 text-4xl leading-[0.96]">Browse categories without guessing the route.</p>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">
          Category navigation reflects the catalog structure coming from the backend, including subcategories when they exist.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full border border-[var(--line)] bg-white/46 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] transition hover:bg-white/72"
          href="/products"
        >
          Open full directory
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }, (_, index) => (
            <div className="rounded-[1.2rem] border border-[rgba(21,19,15,.1)] bg-[#fffaf2] p-4" key={`category-skeleton-${index}`}>
              <div className="h-4 w-32 rounded-full bg-black/8" />
              <div className="mt-4 h-3 w-full rounded-full bg-black/8" />
              <div className="mt-2 h-3 w-2/3 rounded-full bg-black/8" />
            </div>
          ))
        ) : categoryGroups.length > 0 ? (
          categoryGroups.map((group) => (
            <article className="rounded-[1.2rem] border border-[rgba(21,19,15,.1)] bg-[#fffaf2] p-4" key={group.slug}>
              <Link
                className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink)] transition hover:text-[var(--accent)]"
                href={`/categories/${group.slug}` as Route}
              >
                {group.name}
              </Link>
              {group.children.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.children.map((child) => (
                    <Link
                      className="rounded-full border border-[rgba(21,19,15,.1)] bg-white px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[rgba(21,19,15,.18)] hover:text-[var(--ink)]"
                      href={`/categories/${child.slug}` as Route}
                      key={child.slug}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Explore the full {group.name.toLowerCase()} selection.</p>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-[rgba(21,19,15,.1)] bg-[#fffaf2] p-4 text-sm leading-7 text-[var(--muted)]">
            Categories are loading from the catalog.
          </div>
        )}
      </div>
    </div>
  );
}

type CategoryGroup = Readonly<{
  children: readonly Pick<CategoryDto, 'name' | 'slug'>[];
  name: string;
  slug: string;
}>;

function buildCategoryGroups(categories: readonly CategoryDto[]): readonly CategoryGroup[] {
  const parentCategories = categories
    .filter((category) => !category.parentId)
    .sort((left, right) => left.name.localeCompare(right.name));

  return parentCategories.map((parentCategory) => ({
    children: categories
      .filter((category) => category.parentId === parentCategory.id)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((childCategory) => ({ name: childCategory.name, slug: childCategory.slug })),
    name: parentCategory.name,
    slug: parentCategory.slug,
  }));
}
