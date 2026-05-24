'use client';

import type { CategoryDto } from '@northlane/contracts';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCategories } from '../../features/catalog/catalog-hooks';
import { useAuthStore } from '../../features/auth/auth-store';

type NavKey = 'categories' | 'orders' | 'shop' | null;
type NavigationKey =
  | 'allProducts'
  | 'deliveryAddresses'
  | 'links.allProducts'
  | 'links.deliveryAddresses'
  | 'links.newArrivals'
  | 'links.orderHistory'
  | 'links.profileDetails'
  | 'links.savedAddresses'
  | 'links.signInOrders'
  | 'links.tailoring'
  | 'links.winterEdit'
  | 'newArrivals'
  | 'orderHistory'
  | 'profileDetails'
  | 'savedAddresses'
  | 'signInOrders'
  | 'tailoring'
  | 'winterEdit';

type QuickLinkItem = Readonly<{
  descriptionKey: NavigationKey;
  href: ComponentProps<typeof Link>['href'];
  labelKey: NavigationKey;
}>;

const shopLinks: readonly QuickLinkItem[] = [
  {
    descriptionKey: 'links.allProducts',
    href: '/products',
    labelKey: 'allProducts',
  },
  {
    descriptionKey: 'links.newArrivals',
    href: { pathname: '/products', query: { sortBy: 'newest' } },
    labelKey: 'newArrivals',
  },
  {
    descriptionKey: 'links.winterEdit',
    href: '/categories/sweaters',
    labelKey: 'winterEdit',
  },
  {
    descriptionKey: 'links.tailoring',
    href: '/categories/sacos',
    labelKey: 'tailoring',
  },
] as const;

const guestOrderLinks: readonly QuickLinkItem[] = [
  {
    descriptionKey: 'links.signInOrders',
    href: '/login',
    labelKey: 'signInOrders',
  },
  {
    descriptionKey: 'links.savedAddresses',
    href: '/account/addresses',
    labelKey: 'savedAddresses',
  },
] as const;

const signedInOrderLinks: readonly QuickLinkItem[] = [
  {
    descriptionKey: 'links.orderHistory',
    href: '/account/orders',
    labelKey: 'orderHistory',
  },
  {
    descriptionKey: 'links.profileDetails',
    href: '/account/profile',
    labelKey: 'profileDetails',
  },
  {
    descriptionKey: 'links.deliveryAddresses',
    href: '/account/addresses',
    labelKey: 'deliveryAddresses',
  },
] as const;

export function HeaderNav() {
  const t = useTranslations('navigation');
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
          label={t('shop')}
          onPointerEnter={() => openPanel('shop')}
        />
        <NavTrigger
          active={activePanel === 'categories'}
          label={t('categories')}
          onPointerEnter={() => openPanel('categories')}
        />
        <NavTrigger
          active={activePanel === 'orders'}
          label={t('orders')}
          onPointerEnter={() => openPanel('orders')}
        />
      </nav>
      <div className="pointer-events-none absolute left-1/2 top-full z-50 w-[min(76rem,calc(100vw-5rem))] -translate-x-1/2 pt-2">
        {activePanel ? (
          <div className="pointer-events-auto grid gap-6 rounded-[1.6rem] border border-[rgba(21,19,15,.12)] bg-[var(--paper-solid)] p-5 shadow-[0_24px_60px_rgba(22,19,15,.16)]">
            {activePanel === 'shop' ? (
              <QuickLinksPanel
                eyebrow={t('shopPanelEyebrow')}
                links={shopLinks}
                summary={t('shopPanelSummary')}
                title={t('shopPanelTitle')}
              />
            ) : null}
            {activePanel === 'orders' ? (
              <QuickLinksPanel
                eyebrow={user ? t('ordersSignedInEyebrow') : t('ordersGuestEyebrow')}
                links={orderLinks}
                summary={user ? t('ordersSignedInSummary') : t('ordersGuestSummary')}
                title={t('shopPanelTitle')}
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
  title,
}: Readonly<{
  eyebrow: string;
  links: readonly QuickLinkItem[];
  summary: string;
  title: string;
}>) {
  const t = useTranslations('navigation');

  return (
    <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <p className="display-title mt-4 text-4xl leading-[0.96]">{title}</p>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{summary}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            className="rounded-[1.2rem] border border-[rgba(21,19,15,.1)] bg-[#fffaf2] px-4 py-4 transition hover:bg-white"
            href={link.href}
            key={link.labelKey}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
              {t(link.labelKey)}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{t(link.descriptionKey)}</p>
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
  const t = useTranslations('navigation');

  return (
    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
      <div>
        <p className="eyebrow">{t('catalogMap')}</p>
        <p className="display-title mt-4 text-4xl leading-[0.96]">{t('categoriesTitle')}</p>
        <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">
          {t('categoriesSummary')}
        </p>
        <Link
          className="mt-6 inline-flex rounded-full border border-[var(--line)] bg-white/46 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] transition hover:bg-white/72"
          href="/products"
        >
          {t('openDirectory')}
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
                href={`/categories/${group.slug}`}
              >
                {group.name}
              </Link>
              {group.children.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.children.map((child) => (
                    <Link
                      className="rounded-full border border-[rgba(21,19,15,.1)] bg-white px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[rgba(21,19,15,.18)] hover:text-[var(--ink)]"
                      href={`/categories/${child.slug}`}
                      key={child.slug}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {t('exploreCategory', { name: group.name.toLowerCase() })}
                </p>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-[rgba(21,19,15,.1)] bg-[#fffaf2] p-4 text-sm leading-7 text-[var(--muted)]">
            {t('categoriesLoading')}
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
