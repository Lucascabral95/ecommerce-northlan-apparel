'use client';

import { Button } from '../../shared/ui/button';

export function CatalogPagination({
  currentPage,
  onPageChange,
  pageSize,
  totalItems,
}: Readonly<{
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
}>) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pages = buildVisiblePages(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-[var(--line)] pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          Showing <span className="font-semibold text-[var(--ink)]">{startItem}</span>
          {' '}to <span className="font-semibold text-[var(--ink)]">{endItem}</span>
          {' '}of <span className="font-semibold text-[var(--ink)]">{totalItems}</span> pieces
        </p>
        <p className="text-sm text-[var(--muted)]">
          Page <span className="font-semibold text-[var(--ink)]">{currentPage}</span> of{' '}
          <span className="font-semibold text-[var(--ink)]">{totalPages}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="min-h-10 cursor-pointer rounded-lg px-4 text-[0.7rem]"
          disabled={currentPage <= 1}
          intent="quiet"
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Previous
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            className="min-h-10 min-w-10 cursor-pointer rounded-lg px-3 text-[0.78rem]"
            intent={page === currentPage ? 'primary' : 'quiet'}
            onClick={() => onPageChange(page)}
            type="button"
          >
            {page}
          </Button>
        ))}
        <Button
          className="min-h-10 cursor-pointer rounded-lg px-4 text-[0.7rem]"
          disabled={currentPage >= totalPages}
          intent="quiet"
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function buildVisiblePages(currentPage: number, totalPages: number): readonly number[] {
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  const normalizedStartPage = Math.max(1, endPage - 4);
  const pages: number[] = [];

  for (let page = normalizedStartPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  return pages;
}
