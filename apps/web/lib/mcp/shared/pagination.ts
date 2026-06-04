export interface PaginationMeta {
  count: number;
  offset: number;
  limit: number;
  has_more: boolean;
  next_offset: number | null;
}

export function paginationMeta(
  items: unknown[],
  limit: number,
  offset: number,
): PaginationMeta {
  const count = items.length;
  const has_more = count === limit;
  return {
    count,
    offset,
    limit,
    has_more,
    next_offset: has_more ? offset + limit : null,
  };
}
