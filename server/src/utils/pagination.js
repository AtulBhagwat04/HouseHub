/** Page/limit parsing with sane caps so a client cannot ask for 1M documents. */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedLimit = Number.parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta({ page, limit, total }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
}

/**
 * Whitelisted sort parsing: "date:desc" -> { date: -1 }.
 * Anything not in `allowed` falls back to the default so a crafted `sort`
 * parameter can never produce an unindexed full-collection sort.
 */
export function parseSort(sortParam, allowed, fallback) {
  if (!sortParam) return fallback;
  const [field, direction] = String(sortParam).split(':');
  if (!allowed.includes(field)) return fallback;
  return { [field]: direction === 'asc' ? 1 : -1 };
}

export default { parsePagination, buildMeta, parseSort };
