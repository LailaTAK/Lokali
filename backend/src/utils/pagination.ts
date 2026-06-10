// backend/src/utils/pagination.ts

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Parses and sanitizes the page and limit query parameters from an HTTP request.
 * Computes the correct database row skip count.
 * 
 * @param {PaginationQuery} query - The query object from the Express request (req.query).
 * @returns {PaginationResult} An object containing sanitized page, limit, and computed skip index.
 */
export function parsePagination(query: PaginationQuery): PaginationResult {
  // Parse page with fallback to 1
  let page = parseInt(String(query.page), 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Parse limit with fallback to 10
  let limit = parseInt(String(query.limit), 10);
  if (isNaN(limit) || limit < 1) {
    limit = 10;
  }

  // Enforce a maximum limit of 100 to avoid overloading the database
  if (limit > 100) {
    limit = 100;
  }

  // Calculate skipped items
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
}

/**
 * Constructs a standardized paginated response JSON structure.
 * 
 * @template T
 * @param {T[]} data - Array of matching records for the current page.
 * @param {number} total - Total number of records matching the query in the database.
 * @param {number} page - Current requested page.
 * @param {number} limit - Maximum number of items returned per page.
 * @returns {PaginatedResponse<T>} Paginated response with data and calculation-backed meta-data.
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

// FICHIER SUIVANT : backend/src/utils/geocoder.ts
