# Next.js Best Practices — Rendering Strategy & Secure Implementation

This steering document defines mandatory evaluation and implementation standards for Next.js. Before writing any component, page, or data-fetching logic, Kiro must evaluate which rendering model is appropriate and apply the corresponding rules.

---

## Mandatory Evaluation — Decision Tree

Before implementing any file, answer these questions in order:

```
Does this file need useState, useEffect, useReducer, or event handlers?
├── YES → Client Component ("use client")
└── NO  → Does it need browser-only APIs (window, document, localStorage)?
          ├── YES → Client Component ("use client")
          └── NO  → Does it perform a mutation triggered by user action?
                    ├── YES → Server Action ("use server" in actions file)
                    └── NO  → Server Component (default, no directive needed)
```

**Default to Server Components.** Only add `"use client"` when the decision tree above forces it.

---

## 1. Server Components — Rules and Best Practices

Server Components run exclusively on the server. They have direct access to databases, file systems, and secrets, and they never ship JavaScript to the browser.

### When to Use

- Any page, layout, or component that displays data fetched from a database or API.
- Any component that accesses environment variables or secrets.
- Any component that does not require user interaction or browser APIs.
- The outer shell of a feature — wrap interactive sub-components inside a Server Component parent.

### Rules

- **Always async.** Server Components that fetch data must be declared `async`.
- **Never use React hooks.** `useState`, `useEffect`, `useContext`, `useRef` are forbidden.
- **Fetch data directly.** Call database queries or use cases directly inside the component — no `useEffect` + `fetch` pattern.
- **Use `React.cache()`** to deduplicate identical fetches that are called from multiple Server Components in the same render tree.
- **Never pass non-serializable values as props to Client Components.** Functions, class instances, `Date` objects, `Map`, `Set`, and `Symbol` cannot cross the server-client boundary. Convert them to plain serializable types first.
- **Colocate data fetching with the component that needs it.** Do not fetch at the top level and prop-drill. Each Server Component fetches its own data.
- **Use `Suspense` boundaries** to wrap async Server Components and show loading states without blocking the entire page.

### Examples

```typescript
// app/(dashboard)/invoices/page.tsx
import { Suspense } from "react";
import { InvoiceList } from "@/modules/invoicing/presentation/components/InvoiceList";
import { InvoiceSkeleton } from "@/shared/ui/skeletons";

// ✅ Server Component — async, no hooks, no "use client"
export default async function InvoicesPage() {
  return (
    <main>
      <h1>Invoices</h1>
      <Suspense fallback={<InvoiceSkeleton />}>
        <InvoiceList />   {/* InvoiceList is also a Server Component */}
      </Suspense>
    </main>
  );
}
```

```typescript
// modules/invoicing/presentation/components/InvoiceList.tsx
import { DrizzleInvoiceRepository } from "../../infrastructure/repositories/drizzleInvoiceRepository";
import { listInvoices } from "../../application/use-cases/listInvoices";

// ✅ Colocated async data fetch — no prop drilling from parent
export async function InvoiceList() {
  const repo = new DrizzleInvoiceRepository();
  const invoices = await listInvoices({}, { invoiceRepo: repo });

  return (
    <ul>
      {invoices.map((invoice) => (
        <li key={invoice.id}>{invoice.id} — {invoice.status}</li>
      ))}
    </ul>
  );
}
```

```typescript
// WRONG — passing non-serializable value across the boundary
export async function OrderPage() {
  const order = await getOrder("123");
  return <OrderClient order={order} createdAt={order.createdAt} />; // ❌ Date is not serializable
}

// CORRECT — convert to serializable type before passing
export async function OrderPage() {
  const order = await getOrder("123");
  return (
    <OrderClient
      order={{ ...order, createdAt: order.createdAt.toISOString() }} // ✅
    />
  );
}
```

### Performance Patterns

- **Parallel data fetching:** use `Promise.all()` when fetching independent data to avoid sequential waterfalls.
- **Streaming with Suspense:** wrap slow data-fetching components in `<Suspense>` to stream HTML progressively.
- **Avoid sequential await chains** when the results are not interdependent.

```typescript
// WRONG — sequential fetching (slow)
const user = await getUser(id);
const orders = await getOrders(id);
const stats = await getStats(id);

// CORRECT — parallel fetching
const [user, orders, stats] = await Promise.all([
  getUser(id),
  getOrders(id),
  getStats(id),
]);
```

---

## 2. Server Actions — Rules and Best Practices

Server Actions are asynchronous functions that run on the server and are called from Client Components or HTML forms. They are the secure mutation layer.

### When to Use

- Any mutation: create, update, delete, or state change triggered by user interaction.
- Form submissions.
- Revalidating cached data after a mutation.
- Any operation that requires server-side validation, database access, or secret environment variables.

### When NOT to Use

- Data fetching for display purposes — use Server Components instead.
- Long-running background tasks — use a queue or a cron job.
- Replacing API routes when an external client (mobile app, third-party service) must call the endpoint.

### Rules

- **Always place in a dedicated `actions.ts` file** co-located with the route segment or module presentation layer. Never define a Server Action inline inside a component file.
- **Always add `"use server"` at the top of the file** — not per function.
- **Always validate all input with Zod** before executing any logic. Never trust raw `FormData`, raw arguments, or data from the client.
- **Always return a typed `ActionResult`** — never throw unhandled errors to the client. Map domain errors to structured responses.
- **Always revalidate or redirect** after a successful mutation using `revalidatePath`, `revalidateTag`, or `redirect`.
- **Never return sensitive data** (passwords, tokens, internal IDs that should be hidden) in the action result.
- **Never trust the client for authorization.** Re-check the session and permissions inside every Server Action, even if the UI already restricts access.
- **Never perform the mutation if authorization fails** — throw or return an error result immediately.

### Authorization Pattern

Every Server Action that touches user data must follow this sequence:

1. Obtain and verify the session.
2. Verify the user has permission for the specific resource.
3. Validate the input.
4. Execute the use case.
5. Revalidate or redirect.

```typescript
// modules/invoicing/presentation/actions/invoiceActions.ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { DrizzleInvoiceRepository } from "../../infrastructure/repositories/drizzleInvoiceRepository";
import { deleteInvoice } from "../../application/use-cases/deleteInvoice";
import { InvoiceNotFoundError, InvoiceForbiddenError } from "../../domain/errors/invoiceErrors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

const DeleteInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
});

export async function deleteInvoiceAction(
  rawInput: unknown
): Promise<ActionResult> {
  // Step 1 — Authentication
  const session = await requireSession(); // throws redirect to /login if unauthenticated

  // Step 2 — Input validation
  const parsed = DeleteInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid input", code: "VALIDATION_ERROR" };
  }

  try {
    const repo = new DrizzleInvoiceRepository();

    // Step 3 — Authorization + use case execution (authorization happens inside the use case)
    await deleteInvoice(
      { invoiceId: parsed.data.invoiceId, requestingUserId: session.userId },
      { invoiceRepo: repo }
    );

    // Step 4 — Revalidate
    revalidatePath("/invoices");
    return { success: true, data: undefined };

  } catch (err) {
    if (err instanceof InvoiceNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    if (err instanceof InvoiceForbiddenError) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }
    throw err; // unexpected errors go to the error boundary
  }
}
```

### Form Submissions

Prefer native HTML `<form action={serverAction}>` for progressive enhancement. Use `useTransition` in Client Components when you need to track pending state.

```typescript
// CORRECT — progressive enhancement with native form
// modules/invoicing/presentation/components/InvoiceForm.tsx (Server Component)
import { createInvoiceAction } from "../actions/invoiceActions";

export function InvoiceForm() {
  return (
    <form action={createInvoiceAction}>
      <input name="customerId" type="text" required />
      <input name="amount" type="number" required />
      <button type="submit">Create Invoice</button>
    </form>
  );
}
```

```typescript
// CORRECT — Client Component with pending state using useTransition
"use client";
import { useTransition } from "react";
import { deleteInvoiceAction } from "../actions/invoiceActions";

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInvoiceAction({ invoiceId });
      if (!result.success) console.error(result.error);
    });
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
```

---

## 3. Client Components — Rules and Best Practices

Client Components are rendered on the server for the initial HTML and then hydrated in the browser. They are the only place where browser APIs and React interactivity work.

### When to Use

- Components that use `useState`, `useReducer`, `useEffect`, `useRef`, or any other React hook.
- Components with event handlers (`onClick`, `onChange`, `onSubmit`, etc.).
- Components that use browser APIs (`window`, `document`, `localStorage`, `navigator`).
- Third-party components that require client-side execution.

### When NOT to Use

- Components that only display data without interaction — use Server Components.
- Components that need to fetch or display sensitive server-side data — use Server Components.

### Rules

- **Push `"use client"` as deep as possible** in the component tree. Isolate only the interactive part, not the entire page.
- **Never import server-only modules** (`db`, repositories, services, `server-only`) inside Client Components.
- **Never expose secrets or server-only logic** in Client Components — they ship to the browser.
- **Receive data as props** from a parent Server Component. Do not fetch data inside Client Components using `useEffect` + `fetch` when a Server Component can provide the data instead.
- **Call Server Actions for mutations**, not direct `fetch` calls to API routes (unless the API route must serve external consumers).
- Use `useOptimistic` for optimistic UI updates after Server Action calls.
- Use `useFormStatus` inside form children to read the pending state of a parent form submission.

```typescript
// WRONG — "use client" applied too high, entire feature loses server rendering
// app/(dashboard)/invoices/page.tsx
"use client"; // ❌ This makes the entire page a Client Component
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    fetch("/api/invoices").then(...).then(setInvoices);
  }, []);
  return <InvoiceList invoices={invoices} />;
}

// CORRECT — only the interactive part is a Client Component
// app/(dashboard)/invoices/page.tsx (Server Component — no directive)
export default async function InvoicesPage() {
  const invoices = await fetchInvoices(); // server-side fetch
  return (
    <div>
      <InvoiceList invoices={invoices} />      {/* Server Component */}
      <AddInvoiceButton />                      {/* Client Component — only the button */}
    </div>
  );
}
```

```typescript
// modules/invoicing/presentation/components/AddInvoiceButton.tsx
"use client"; // ✅ Only this small piece is a Client Component
import { useTransition } from "react";
import { createInvoiceAction } from "../actions/invoiceActions";

export function AddInvoiceButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => createInvoiceAction({}))}
      disabled={isPending}
    >
      {isPending ? "Creating…" : "New Invoice"}
    </button>
  );
}
```

---

## 4. Data Fetching Strategy

| Scenario | Recommended approach |
|---|---|
| Display data from the database | Server Component with `async/await` |
| Display data that changes often and must be fresh on every request | Server Component — opt out of cache with `{ cache: "no-store" }` |
| Display data that is mostly static (e.g., CMS content) | Server Component with `revalidate` or `fetch` with `next.revalidate` |
| Mutate data after user action | Server Action |
| Real-time data (live updates) | Client Component with polling, WebSocket, or SSE |
| Data needed only in the browser (e.g., geolocation, device info) | Client Component |

---

## 5. Caching and Revalidation

- **`revalidatePath(path)`** — revalidate all data associated with a given route. Use after mutations that affect a specific page.
- **`revalidateTag(tag)`** — revalidate all fetches tagged with a specific cache tag. Use for fine-grained cache invalidation.
- **`unstable_cache()`** — wrap expensive server-side computations that should be cached across requests.
- Tag all data fetches that will need targeted invalidation: `fetch(url, { next: { tags: ["invoices"] } })`.
- After every successful Server Action mutation, call the appropriate `revalidatePath` or `revalidateTag`.

```typescript
// Tagging a fetch for targeted revalidation
const invoices = await fetch("/api/invoices", {
  next: { tags: ["invoices"], revalidate: 60 },
});

// In the Server Action after mutation
revalidateTag("invoices"); // only revalidates fetches tagged "invoices"
```

---

## 6. Security Rules

These rules apply to every implementation and are not optional.

- **Secrets and environment variables** prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put sensitive values in `NEXT_PUBLIC_` variables.
- **Session verification is mandatory** in every Server Action and every API Route Handler. Never rely on client-side state or cookies alone.
- **Authorization must be checked server-side** for every resource access. Never authorize based on data sent from the client.
- **Input validation with Zod is mandatory** for all external input: Server Action arguments, API route bodies, URL params, and search params.
- **Never serialize full database rows** to Client Components or API responses. Project only the fields the client needs.
- **Mark all server-only modules** with `import "server-only"` to get a build-time error if accidentally imported into a Client Component.
- **`headers()` and `cookies()` from `next/headers`** are server-only — they must only be used inside Server Components, Server Actions, or Route Handlers.

```typescript
// lib/auth.ts — server-only session helper
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  return session;
}
```

---

## 7. Rendering Checklist

Before submitting any implementation, verify:

- [ ] Every new file has been evaluated through the decision tree at the top of this document.
- [ ] No `"use client"` directive appears on a file that does not strictly need it.
- [ ] No React hooks (`useState`, `useEffect`, etc.) appear in Server Components.
- [ ] No `db`, repository, or service imports appear inside Client Components.
- [ ] Every Server Action validates input with Zod before executing logic.
- [ ] Every Server Action verifies the session before accessing any resource.
- [ ] Every Server Action returns a typed `ActionResult` — no unhandled thrown errors reach the client.
- [ ] Every Server Action calls `revalidatePath` or `revalidateTag` after a successful mutation.
- [ ] No `NEXT_PUBLIC_` variable contains a secret or internal implementation detail.
- [ ] Non-serializable values (Date, class instances, functions) are converted before being passed to Client Components.
- [ ] Independent data fetches inside a Server Component use `Promise.all()` instead of sequential `await`.
