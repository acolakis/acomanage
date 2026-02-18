interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parse pagination parameters from URL search params.
 * Returns null if no pagination is requested (backwards compatible).
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 50
): PaginationParams | null {
  const pageParam = searchParams.get("page");
  if (!pageParam) return null;

  const page = Math.max(1, parseInt(pageParam) || 1);
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(200, Math.max(1, parseInt(limitParam) || defaultLimit))
    : defaultLimit;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

/**
 * Build a paginated response object.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) {
  return {
    data,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}
