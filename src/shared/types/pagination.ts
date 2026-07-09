// ---------------------------------------------------------------------------
// Shared pagination result type
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
