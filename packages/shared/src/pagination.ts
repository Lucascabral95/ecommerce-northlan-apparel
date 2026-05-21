export type PaginationParams = Readonly<{
  page?: number;
  pageSize?: number;
}>;

export type NormalizedPaginationParams = Readonly<{
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
}>;

export type PaginationMeta = Readonly<{
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
}>;

export type PaginatedResult<TItem> = Readonly<{
  items: readonly TItem[];
  meta: PaginationMeta;
}>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function normalizePagination(params: PaginationParams = {}): NormalizedPaginationParams {
  const page = normalizePositiveInteger(params.page, DEFAULT_PAGE);
  const pageSize = Math.min(normalizePositiveInteger(params.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    page,
    pageSize,
  };
}

export function createPaginationMeta(totalItems: number, params: NormalizedPaginationParams): PaginationMeta {
  const pageCount = Math.ceil(totalItems / params.pageSize);

  return {
    hasNextPage: params.page < pageCount,
    hasPreviousPage: params.page > 1,
    page: params.page,
    pageCount,
    pageSize: params.pageSize,
    totalItems,
  };
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isInteger(value) || value <= 0) {
    return fallback;
  }

  return value;
}
