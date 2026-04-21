# Clean Architecture + Screaming Architecture — Next.js & TypeScript

This steering document defines the structural and architectural standards for this project. All source code must follow Clean Architecture principles expressed through a Screaming Architecture folder structure adapted to the Next.js App Router.

---

## Core Concepts

### Clean Architecture

Clean Architecture organizes code into concentric layers. Dependencies always point **inward** — outer layers depend on inner layers, never the reverse.

```
┌─────────────────────────────────────────┐
│           Frameworks & Drivers          │  ← Next.js, Drizzle, fetch, email SDKs
│  ┌───────────────────────────────────┐  │
│  │       Interface Adapters          │  │  ← Server Actions, API Routes, Components
│  │  ┌─────────────────────────────┐  │  │
│  │  │      Application Layer      │  │  │  ← Use Cases (services)
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │    Domain / Entities  │  │  │  │  ← Types, interfaces, business rules
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Dependency Rule:** `Domain` has zero imports from the project. `Application` imports only from `Domain`. `Adapters` import from `Application` and `Domain`. `Frameworks` import from everything.

### Screaming Architecture

The folder structure must **scream the business domain**, not the technology. A developer reading the top-level folders must immediately understand what the application does, not what framework it uses.

```
// WRONG — structure screams the technology
src/
├── components/
├── hooks/
├── services/
├── utils/
└── pages/

// CORRECT — structure screams the domain
src/
├── invoicing/
├── user-management/
├── product-catalog/
├── order-processing/
└── notifications/
```

---

## Mandatory Folder Structure

```
src/
├── app/                            # Next.js App Router (framework layer only)
│   ├── (marketing)/                # Route group — public pages
│   ├── (dashboard)/                # Route group — authenticated area
│   │   └── [domain-feature]/
│   │       ├── page.tsx            # Server Component: data fetch + layout
│   │       ├── layout.tsx          # Route layout
│   │       ├── loading.tsx         # Suspense fallback
│   │       ├── error.tsx           # Error boundary
│   │       └── not-found.tsx       # Not found boundary
│   ├── api/                        # API Route Handlers (REST endpoints if needed)
│   └── middleware.ts               # Edge middleware (auth guards, redirects)
│
├── modules/                        # Domain modules — this is where the app lives
│   └── [domain-name]/              # One folder per bounded context
│       ├── domain/                 # Inner layer — pure business rules
│       │   ├── entities/           # Core types and value objects
│       │   ├── interfaces/         # Repository and service contracts
│       │   └── errors/             # Domain-specific error classes
│       ├── application/            # Use cases — orchestrate domain logic
│       │   └── use-cases/          # One file per use case
│       ├── infrastructure/         # Outer layer — concrete implementations
│       │   └── repositories/       # Drizzle implementations of domain interfaces
│       └── presentation/           # Interface adapters for Next.js
│           ├── actions/            # Server Actions ("use server")
│           ├── components/         # React components for this domain
│           └── hooks/              # Client-side hooks for this domain
│
├── shared/                         # Cross-domain, non-domain utilities
│   ├── domain/                     # Shared value objects and base types
│   ├── infrastructure/             # Shared infra: db client, mailer, storage
│   └── ui/                         # Primitive UI components (buttons, inputs)
│
└── lib/                            # Framework bootstrapping only
    ├── db/                         # Drizzle client and schema
    ├── auth.ts                     # Session utilities
    └── errors.ts                   # Base error classes
```

---

## Layer Definitions and Rules

### Layer 1 — Domain (Innermost)

**Contains:** Entity types, value objects, repository interfaces, domain error classes.

**Rules:**
- Zero dependencies on other project layers.
- No imports from Next.js, Drizzle, Zod, or any framework.
- No `async` functions — domain types are pure data shapes and contracts.
- Repository interfaces define the **what**, never the **how**.
- Domain errors extend a base `DomainError` class and carry semantic meaning.

```typescript
// modules/invoicing/domain/entities/invoice.ts
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: Date;
  issuedAt: Date;
}

// modules/invoicing/domain/interfaces/invoiceRepository.ts
import type { Invoice } from "../entities/invoice";

export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  findByCustomerId(customerId: string): Promise<Invoice[]>;
  save(invoice: Invoice): Promise<void>;
  delete(id: string): Promise<void>;
}

// modules/invoicing/domain/errors/invoiceErrors.ts
import { DomainError } from "@/lib/errors";

export class InvoiceNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Invoice ${id} not found`);
  }
}

export class InvoiceAlreadyPaidError extends DomainError {
  constructor(id: string) {
    super(`Invoice ${id} has already been paid`);
  }
}
```

---

### Layer 2 — Application (Use Cases)

**Contains:** One file per use case. Each use case orchestrates domain objects and calls repository interfaces.

**Rules:**
- Import only from the Domain layer of the same module or `shared/domain`.
- Accept dependencies (repositories, services) through the function signature — never instantiate them internally.
- Each use case function performs exactly one operation (SRP).
- Validate inputs with Zod at this layer — use case inputs are the application boundary.
- Throw domain errors; do not return `null` to signal failures.
- No Next.js imports. No `"use server"`. This layer is framework-agnostic.

```typescript
// modules/invoicing/application/use-cases/markInvoiceAsPaid.ts
import { z } from "zod";
import type { InvoiceRepository } from "../../domain/interfaces/invoiceRepository";
import { InvoiceNotFoundError, InvoiceAlreadyPaidError } from "../../domain/errors/invoiceErrors";

export const MarkInvoiceAsPaidInput = z.object({
  invoiceId: z.string().uuid(),
  paidAt: z.date().optional().default(() => new Date()),
});

export type MarkInvoiceAsPaidInput = z.infer<typeof MarkInvoiceAsPaidInput>;

export async function markInvoiceAsPaid(
  input: MarkInvoiceAsPaidInput,
  deps: { invoiceRepo: InvoiceRepository }
): Promise<void> {
  const invoice = await deps.invoiceRepo.findById(input.invoiceId);
  if (!invoice) throw new InvoiceNotFoundError(input.invoiceId);
  if (invoice.status === "paid") throw new InvoiceAlreadyPaidError(input.invoiceId);

  await deps.invoiceRepo.save({ ...invoice, status: "paid" });
}
```

---

### Layer 3 — Infrastructure (Repositories)

**Contains:** Concrete implementations of domain repository interfaces using Drizzle ORM.

**Rules:**
- Implement every method declared in the corresponding domain interface.
- Import `db` only inside this layer — never in application or domain layers.
- Map database rows to domain entities explicitly. Do not leak Drizzle types into the domain.
- Never contain business logic — only data-access operations.
- Mark the file with `import "server-only"` to prevent accidental client import.

```typescript
// modules/invoicing/infrastructure/repositories/drizzleInvoiceRepository.ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoicesTable } from "@/lib/db/schema";
import type { InvoiceRepository } from "../../domain/interfaces/invoiceRepository";
import type { Invoice } from "../../domain/entities/invoice";

export class DrizzleInvoiceRepository implements InvoiceRepository {
  async findById(id: string): Promise<Invoice | null> {
    const row = await db.query.invoicesTable.findFirst({
      where: eq(invoicesTable.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByCustomerId(customerId: string): Promise<Invoice[]> {
    const rows = await db.query.invoicesTable.findMany({
      where: eq(invoicesTable.customerId, customerId),
    });
    return rows.map(this.toEntity);
  }

  async save(invoice: Invoice): Promise<void> {
    await db
      .insert(invoicesTable)
      .values(this.toRow(invoice))
      .onConflictDoUpdate({ target: invoicesTable.id, set: this.toRow(invoice) });
  }

  async delete(id: string): Promise<void> {
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  }

  private toEntity(row: typeof invoicesTable.$inferSelect): Invoice {
    return {
      id: row.id,
      customerId: row.customerId,
      amount: Number(row.amount),
      status: row.status as Invoice["status"],
      dueDate: row.dueDate,
      issuedAt: row.issuedAt,
    };
  }

  private toRow(invoice: Invoice): typeof invoicesTable.$inferInsert {
    return {
      id: invoice.id,
      customerId: invoice.customerId,
      amount: String(invoice.amount),
      status: invoice.status,
      dueDate: invoice.dueDate,
      issuedAt: invoice.issuedAt,
    };
  }
}
```

---

### Layer 4 — Presentation (Interface Adapters)

**Contains:** Server Actions, Server Components, Client Components, and client hooks — all scoped to the domain module.

**Rules:**
- Server Actions are the **composition root**: they instantiate infrastructure dependencies and call use cases.
- Server Actions must validate all external input with Zod and return a structured `ActionResult` type.
- Server Components fetch data by calling use cases directly (with injected repositories) — they do not call repositories themselves.
- Client Components receive serializable data as props and call Server Actions for mutations.
- No business logic in components or Server Actions — delegate everything to use cases.

```typescript
// modules/invoicing/presentation/actions/invoiceActions.ts
"use server";
import { z } from "zod";
import { DrizzleInvoiceRepository } from "../../infrastructure/repositories/drizzleInvoiceRepository";
import { markInvoiceAsPaid, MarkInvoiceAsPaidInput } from "../../application/use-cases/markInvoiceAsPaid";
import { InvoiceNotFoundError, InvoiceAlreadyPaidError } from "../../domain/errors/invoiceErrors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export async function markInvoicePaidAction(
  rawInput: unknown
): Promise<ActionResult> {
  const parsed = MarkInvoiceAsPaidInput.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message, code: "VALIDATION_ERROR" };
  }

  try {
    const invoiceRepo = new DrizzleInvoiceRepository();
    await markInvoiceAsPaid(parsed.data, { invoiceRepo });
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof InvoiceNotFoundError) {
      return { success: false, error: err.message, code: "NOT_FOUND" };
    }
    if (err instanceof InvoiceAlreadyPaidError) {
      return { success: false, error: err.message, code: "CONFLICT" };
    }
    throw err; // unexpected errors bubble up to the error boundary
  }
}
```

```typescript
// modules/invoicing/presentation/components/InvoiceDetail.tsx — Server Component
import { DrizzleInvoiceRepository } from "../../infrastructure/repositories/drizzleInvoiceRepository";
import { getInvoiceById } from "../../application/use-cases/getInvoiceById";
import { notFound } from "next/navigation";
import { MarkPaidButton } from "./MarkPaidButton"; // Client Component

interface Props {
  invoiceId: string;
}

export async function InvoiceDetail({ invoiceId }: Props) {
  const invoiceRepo = new DrizzleInvoiceRepository();
  const invoice = await getInvoiceById({ invoiceId }, { invoiceRepo });

  if (!invoice) notFound();

  return (
    <div>
      <h1>Invoice #{invoice.id}</h1>
      <p>Status: {invoice.status}</p>
      <p>Amount: ${invoice.amount}</p>
      {invoice.status !== "paid" && <MarkPaidButton invoiceId={invoice.id} />}
    </div>
  );
}
```

---

## Module Naming and Boundaries

### Naming

- Module folder names must reflect the **business domain**, not the technology: `invoicing/`, `user-management/`, `product-catalog/`, not `invoice-service/`, `user-crud/`, `product-api/`.
- Use case file names must be **verb + noun**, describing the operation: `markInvoiceAsPaid.ts`, `createCustomer.ts`, `listOrdersByStatus.ts`.
- Repository files are prefixed with their implementation technology: `drizzle[Entity]Repository.ts`.
- Domain entity files use the singular noun: `invoice.ts`, `customer.ts`, `order.ts`.

### Module Boundaries

- A module must never import from another module's `domain/`, `application/`, or `infrastructure/` layers directly.
- Cross-module communication goes through `shared/domain` types or through explicit use case composition in `application/`.
- If two modules need to share an entity type, extract it to `shared/domain/` — do not create a cross-module import.

```typescript
// WRONG — order module imports directly from invoicing module internals
// modules/order-processing/application/use-cases/completeOrder.ts
import { Invoice } from "@/modules/invoicing/domain/entities/invoice"; // ❌

// CORRECT — shared type lives in shared/domain
// shared/domain/types/invoice.ts
export interface InvoiceSummary {
  id: string;
  status: string;
  amount: number;
}

// Both modules import from shared
import type { InvoiceSummary } from "@/shared/domain/types/invoice";
```

---

## Import Direction Enforcement

Always verify that imports follow the dependency rule before committing. The allowed import directions are:

```
Domain        → (no project imports)
Application   → Domain
Infrastructure → Domain, shared/infrastructure
Presentation  → Application, Domain, Infrastructure (composition root only in actions)
app/          → Presentation, Application (Server Components may call use cases directly)
shared/ui     → (no domain imports)
```

**Forbidden import patterns:**
- `domain/` importing from `application/`, `infrastructure/`, or `presentation/`
- `application/` importing from `infrastructure/` or `presentation/`
- Client Components importing from `infrastructure/` or `lib/db`
- Any layer importing from `app/` (the Next.js route folder is a consumer, not a library)

---

## Screaming Architecture Checklist

When adding a new feature, verify the following before considering it complete:

- [ ] The feature lives inside a module named after the **business concept**, not the technology.
- [ ] A new bounded context has its own folder under `modules/` with all four sub-layers.
- [ ] Domain types and interfaces contain zero framework imports.
- [ ] Each use case file performs exactly one operation and accepts dependencies as parameters.
- [ ] Repository implementations are the only files that import `db` from `@/lib/db`.
- [ ] Server Actions are the only place where repositories are instantiated.
- [ ] Client Components contain no business logic and make no direct database or service calls.
- [ ] Cross-module shared types live in `shared/domain/`, not imported across module internals.
- [ ] Every file that accesses the database is marked with `import "server-only"`.
