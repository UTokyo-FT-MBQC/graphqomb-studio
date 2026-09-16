import { type ReactNode, useState } from "react";

const PAGE_SIZE = 100;

/** Bound the Elements panel's DOM size even when the full graph contains millions of items. */
export function PaginatedList<T>({
  items,
  renderItem,
}: {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
}): ReactNode {
  const [pagination, setPagination] = useState({ items, page: 0 });
  // Filtering, sorting, or replacing the graph starts at the first page.
  if (pagination.items !== items) setPagination({ items, page: 0 });
  const page = pagination.items === items ? pagination.page : 0;
  const start = page * PAGE_SIZE;

  return (
    <>
      {items.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPagination({ items, page: page - 1 })}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Previous page
          </button>
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, items.length)} of {items.length}
          </span>
          <button
            type="button"
            disabled={start + PAGE_SIZE >= items.length}
            onClick={() => setPagination({ items, page: page + 1 })}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Next page
          </button>
        </div>
      )}
      {items.slice(start, start + PAGE_SIZE).map(renderItem)}
    </>
  );
}
