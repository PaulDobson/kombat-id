# Data Tables & Pagination — Standards

Every table that displays a list of records **must** implement server-side pagination. This applies to all admin and dashboard list views.

## Rules

- **Never fetch all rows** from a Supabase table without a `.range()` limit. Supabase returns a maximum of 1000 rows silently — unbounded queries will break at scale.
- Every table query must use `.range(offset, offset + PAGE_SIZE - 1)` and `{ count: "exact" }` to get the total count in a single round-trip.
- The default `PAGE_SIZE` is `25`. Adjust only when there is a clear UX reason (e.g. a compact widget may use 10).
- Pagination state lives in URL search params (`?page=2`), never in React state. This makes pages shareable and bookmarkable.
- Sort field and direction also live in URL params (`?sort=name&dir=asc`).

## Required Query Pattern

```typescript
const PAGE_SIZE = 25;
const page = Math.max(1, parseInt(sp.page ?? "1", 10));
const offset = (page - 1) * PAGE_SIZE;

const { data: rows, count } = await adminSupabase
  .from("table_name")
  .select("id, col1, col2", { count: "exact" })
  .order("col1", { ascending: true })
  .range(offset, offset + PAGE_SIZE - 1);

const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
```

## Required UI Pattern

Every paginated table must render:

1. A record count label: `{totalCount.toLocaleString("es-CL")} registros`
2. Previous / Next links
3. A window of up to 5 page number links centered around the current page
4. A "Página X de Y" label

All pagination links must be `<Link>` components (not buttons) so they are crawlable and support browser back/forward.

```tsx
{
  totalPages > 1 && (
    <div className="flex items-center justify-between">
      <p className="text-xs text-neutral-500">
        Página {page} de {totalPages} · {totalCount.toLocaleString("es-CL")}{" "}
        registros
      </p>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={buildUrl(baseParams, { page: String(page - 1) })}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
          >
            ← Anterior
          </Link>
        )}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
          const p2 = start + i;
          return (
            <Link
              key={p2}
              href={buildUrl(baseParams, { page: String(p2) })}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                p2 === page
                  ? "bg-primary-600 border-primary-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
              }`}
            >
              {p2}
            </Link>
          );
        })}
        {page < totalPages && (
          <Link
            href={buildUrl(baseParams, { page: String(page + 1) })}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
          >
            Siguiente →
          </Link>
        )}
      </div>
    </div>
  );
}
```

## Enrichment Queries (joins in JS)

When enriching paginated rows with related data (e.g. membership counts, academy names), **only query for the IDs on the current page**, never for all records:

```typescript
// ✅ CORRECT — scoped to current page only
const ids = rows.map((r) => r.id);
const { data: related } = await adminSupabase
  .from("related_table")
  .select("foreign_id, value")
  .in("foreign_id", ids);

// ❌ WRONG — fetches everything regardless of page
const { data: related } = await adminSupabase
  .from("related_table")
  .select("foreign_id, value");
```

## Supabase 1000-row Limit

Supabase's PostgREST layer silently caps responses at **1000 rows** when no `.range()` is set. Never rely on an unbounded query to return all records — use `.range()` for paginated views and explicit `.limit()` for lookup queries (e.g. dropdowns).

For dropdown/select lists that need all records (e.g. academy selector), use `.limit(500)` and document the assumption. If the list can exceed that, implement a search input instead.

## Checklist

Before considering a table view complete, verify:

- [ ] Query uses `.range(offset, offset + PAGE_SIZE - 1)` with `{ count: "exact" }`
- [ ] `PAGE_SIZE` constant is defined at the top of the file
- [ ] `page` is read from `searchParams` and clamped with `Math.max(1, ...)`
- [ ] Total pages and total count are derived from the `count` returned by Supabase
- [ ] Pagination UI renders Previous, page numbers, and Next links
- [ ] Enrichment queries are scoped to the current page's IDs only
- [ ] No unbounded `.select()` without `.range()` or `.limit()` exists in the file
