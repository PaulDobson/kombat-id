---
inclusion: always
---

# SOLID Principles — TypeScript & Next.js

Every file generated or modified in this project must follow these standards.

---

## Rendering Boundary Classification

Classify every file before writing it:

| File type                            | Default          | Override condition                                                          |
| ------------------------------------ | ---------------- | --------------------------------------------------------------------------- |
| `page.tsx`, `layout.tsx`, components | Server Component | Add `"use client"` only for hooks, event handlers, or browser APIs          |
| Server Actions                       | Server-only      | `"use server"` at top of `actions.ts` file; never inline in component files |
| Repositories / services              | Server-only      | Never import into Client Components                                         |

**Rule:** Push `"use client"` as deep in the tree as possible. Data fetching and business logic belong in Server Components or Server Actions.

---

## 1. Single Responsibility Principle (SRP)

Each file has one reason to change:

- **Server Components** — fetch data and compose layout only. No business logic.
- **Client Components** — interactivity and browser state only. No data fetching, no business logic.
- **Server Actions** — one mutation per action. No bundling of unrelated operations.
- **Services** — one domain operation. No direct database access.
- **Repositories** — one data-access operation. No business or validation logic.
- **`actions.ts`** — always a separate file; never define Server Actions inside a component file that also renders.

```typescript
// WRONG — page does filtering, formatting, and side effects
export default async function UsersPage() {
  const users = await db.query.usersTable.findMany();
  const formatted = users.filter(u => u.active).map(u => ({ ...u, name: u.name.toUpperCase() }));
  await logPageView("users");
  return <UserList users={formatted} />;
}

// CORRECT — each layer owns its concern
export default async function UsersPage() {
  const session = await requireSession();
  const users = await getUsersForDisplay(); // service handles filtering/formatting
  return <UserList users={users} />;
}
```

---

## 2. Open/Closed Principle (OCP)

Extend behavior without modifying existing code:

- Replace growing `if/else` or `switch` chains with strategy maps or registries.
- New Server Actions call existing service functions — never duplicate logic.
- UI variants that render completely different UIs must be separate components, not branches inside one component.
- `middleware.ts` uses matcher config to scope behavior, not internal `if/else` on `req.pathname`.

```typescript
// WRONG — adding a channel requires modifying this function
async function sendNotification(type: string, user: User) {
  if (type === "email") await sendEmail(user);
  if (type === "sms") await sendSms(user);
}

// CORRECT — register a new handler without touching existing code
const handlers: Record<string, (user: User) => Promise<void>> = {
  email: sendEmail,
  sms: sendSms,
};
async function sendNotification(type: string, user: User) {
  const handler = handlers[type];
  if (!handler) throw new Error(`Unknown type: ${type}`);
  await handler(user);
}
```

---

## 3. Liskov Substitution Principle (LSP)

Any implementation of an interface must fully honor its contract:

- Never implement interface methods by throwing `Error("Not implemented")` — redesign the interface instead.
- Zod schemas extended via `.extend()` or `.merge()` must not remove or weaken required fields.
- Server Actions used as form actions must always return a value matching the declared return type — no `undefined` on some branches.
- Custom hooks must return the same shape on every render regardless of internal state.

```typescript
// WRONG — save() silently does nothing on cache miss
class CachedUserRepository implements UserRepository {
  async save(user: User) {
    try {
      cache.set(user.id, user);
    } catch {} // LSP violation
  }
}

// CORRECT — delegate to base; cache is additive
class CachedUserRepository implements UserRepository {
  constructor(
    private base: UserRepository,
    private cache: Cache,
  ) {}
  async save(user: User): Promise<void> {
    await this.base.save(user); // contract honored
    this.cache.set(user.id, user);
  }
}
```

---

## 4. Interface Segregation Principle (ISP)

Interfaces and props must contain only what the consumer actually uses:

- Keep TypeScript interfaces small and focused on a single capability.
- Pass only the fields a component needs — never the full entity (especially avoid passing `passwordHash`, tokens, or internal IDs to Client Components).
- Split "god" service interfaces by domain operation (`UserReader`, `UserWriter`, `UserNotifier`).
- Server Actions accept the minimum input required for their specific mutation.

```typescript
// WRONG — component receives the full User including sensitive fields
function UserAvatar({ user }: { user: User }) { ... }

// CORRECT — component receives only what it renders
function UserAvatar({ userId, email }: { userId: string; email: string }) { ... }
```

---

## 5. Dependency Inversion Principle (DIP)

High-level modules depend on abstractions, not concrete implementations:

- Define TypeScript interfaces for all I/O dependencies (database, email, storage, external APIs).
- Services receive repositories through function parameters — never import the concrete class inside a service.
- `db` appears **only** in repository files. Services import repository interfaces, not `db`.
- **Server Actions are the composition root**: they instantiate concrete repositories and inject them into services/use cases.
- Never import repositories, services, or `db` into Client Components — pass only serializable data as props.

```typescript
// WRONG — service imports db directly
import { db } from "@/lib/db";
export async function getOrdersForUser(userId: string) {
  return db.query.ordersTable.findMany({ where: eq(ordersTable.userId, userId) });
}

// CORRECT — service depends on interface; Server Action is the composition root
// repositories/orderRepository.ts
export interface OrderRepository { findByUserId(userId: string): Promise<Order[]>; }
export class DrizzleOrderRepository implements OrderRepository { ... }

// services/orderService.ts
export function createOrderService(repo: OrderRepository) {
  return { getOrdersForUser: (userId: string) => repo.findByUserId(userId) };
}

// app/orders/actions.ts — composition root
"use server";
export async function fetchUserOrders(userId: string) {
  const repo = new DrizzleOrderRepository();
  return createOrderService(repo).getOrdersForUser(userId);
}
```

---

## Project Conventions

### TypeScript

- All function parameters and return types must be explicitly typed. No implicit `any`.
- Use `interface` for object shapes used as contracts or extended by classes.
- Use `type` for unions, intersections, mapped types, and aliases.
- Use `unknown` instead of `any`; narrow explicitly before use.
- Mark server-only modules with `import "server-only"` to get a build-time error on accidental client import.

### Validation

- Validate all external input (Server Action args, API bodies, URL params) with Zod before use.
- Use `safeParse()` in Server Actions for graceful error handling; use `parse()` only for trusted internal data.
- Return `{ success: true; data: T } | { success: false; error: string; code: string }` from every Server Action.

### Error Handling

- Define domain error classes (`NotFoundError`, `ForbiddenError`, `ConflictError`) in `lib/errors.ts`.
- Services throw domain errors; Server Actions catch and map them to structured `ActionResult` responses.
- Never expose raw error messages, stack traces, or database errors to the client.
- Use `error.tsx` and `not-found.tsx` per route segment for rendering error boundaries.

### File Structure

```
src/
├── app/                        # Next.js App Router (routing only)
│   └── (route-group)/feature/
│       ├── page.tsx            # Server Component — data fetch + layout
│       ├── layout.tsx          # Route layout
│       ├── actions.ts          # Server Actions ("use server")
│       └── FeatureClient.tsx   # Client Component ("use client")
├── modules/[domain]/           # Screaming architecture — one folder per bounded context
│   ├── domain/                 # Entities, interfaces, domain errors (no framework imports)
│   ├── application/            # Use cases — one file per operation
│   ├── infrastructure/         # Drizzle repository implementations
│   └── presentation/           # Actions, components, hooks
├── shared/                     # Cross-domain utilities and primitive UI
└── lib/                        # db client, auth helpers, base error classes
```
