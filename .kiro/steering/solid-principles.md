# SOLID Principles — TypeScript & Next.js Implementation Standards

This steering document defines mandatory coding standards for all source code generated or modified in this project. Every implementation must adhere to the SOLID principles described below, applied to the Next.js App Router architecture with TypeScript.

---

## Next.js Rendering Boundary Rules

Before applying SOLID principles, every file must be classified correctly. These are the foundational rules for the App Router.

| File type | Default | When to change |
|---|---|---|
| `page.tsx`, `layout.tsx`, component files | **Server Component** | Add `"use client"` only when browser APIs, event handlers, or React state/effects are required |
| Server Actions | **Server-only** | Add `"use server"` at the top of the file or function; never call them from other server-side code as plain functions — they are intended for client invocation |
| Repository / service files | **Server-only** | Never import them into Client Components |

**Golden rule:** keep the `"use client"` boundary as deep in the component tree as possible. Push data fetching and business logic up into Server Components or Server Actions.

---

## 1. Single Responsibility Principle (SRP)

**A module, class, or function must have one — and only one — reason to change.**

### Rules

- Each file represents one concept: one page, one server action, one service function, one repository, one UI component.
- Server Components are responsible for **fetching data and composing layout**. They must not contain business logic.
- Client Components are responsible for **interactivity and browser state**. They must not fetch data directly or contain business logic.
- Server Actions are responsible for **one mutation or one form submission**. They must not bundle multiple unrelated operations.
- Service functions encapsulate **one domain operation**. They must not access the database directly.
- Repository functions perform **one data-access operation**. They must not contain business or validation logic.
- Do not define a Server Action inside a Server Component file that also contains rendering logic — extract actions to a dedicated `actions.ts` file.

### Examples

```typescript
// WRONG — Server Component doing too much
// app/users/page.tsx
export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const users = await db.query.usersTable.findMany();
  const filtered = users.filter((u) => u.active);
  const formatted = filtered.map((u) => ({ ...u, name: u.name.toUpperCase() }));

  await logPageView("users", session.userId); // side effect mixed in

  return <UserList users={formatted} />;
}

// CORRECT — each layer handles its own concern
// app/users/page.tsx  (Server Component — layout + data orchestration only)
import { getUsersForDisplay } from "@/services/userService";
import { requireSession } from "@/lib/auth";
import { UserList } from "./UserList";

export default async function UsersPage() {
  const session = await requireSession();
  const users = await getUsersForDisplay();
  return <UserList users={users} />;
}

// services/userService.ts  (domain logic only)
export async function getUsersForDisplay(): Promise<DisplayUser[]> {
  return userRepository.findAllActive();
}

// repositories/userRepository.ts  (data access only)
export async function findAllActive(): Promise<User[]> {
  return db.query.usersTable.findMany({ where: eq(usersTable.active, true) });
}
```

---

## 2. Open/Closed Principle (OCP)

**Software entities should be open for extension but closed for modification.**

### Rules

- Add new pages, Server Actions, and components without modifying existing unrelated files.
- Replace `if/else` chains and `switch` statements that grow over time with strategy maps or registries.
- Design Server Actions to be composable: a new action should call existing service functions, not duplicate their logic.
- UI component variants must be controlled through props — do not conditionally render completely different UIs inside one component. Extract to separate components instead.
- Middleware (`middleware.ts`) must use matcher configuration to scope behavior, not internal `if/else` on `req.pathname`.

### Examples

```typescript
// WRONG — must modify this function to support a new notification channel
async function sendNotification(type: string, user: User) {
  if (type === "email") await sendEmail(user);
  if (type === "sms") await sendSms(user);
  if (type === "push") await sendPush(user); // requires modifying this function
}

// CORRECT — extend by registering a new handler; existing code stays closed
type NotificationHandler = (user: User) => Promise<void>;

const notificationHandlers: Record<string, NotificationHandler> = {
  email: sendEmail,
  sms: sendSms,
};

async function sendNotification(type: string, user: User): Promise<void> {
  const handler = notificationHandlers[type];
  if (!handler) throw new Error(`Unknown notification type: ${type}`);
  await handler(user);
}
```

```typescript
// WRONG — a single component conditionally renders totally different UIs
export function ProductCard({ variant }: { variant: "grid" | "list" | "featured" }) {
  if (variant === "grid") return <div className="grid-card">...</div>;
  if (variant === "list") return <div className="list-card">...</div>;
  return <div className="featured-card">...</div>; // grows unboundedly
}

// CORRECT — each variant is its own closed component; add new ones without modifying old ones
export function GridProductCard(props: ProductCardProps) { ... }
export function ListProductCard(props: ProductCardProps) { ... }
export function FeaturedProductCard(props: ProductCardProps) { ... }
```

---

## 3. Liskov Substitution Principle (LSP)

**Subtypes must be substitutable for their base types without altering program correctness.**

### Rules

- Any class or object that implements a TypeScript interface must satisfy the full contract — all methods, return types, and error behaviors.
- Do not implement interface methods by throwing `Error("Not implemented")` — redesign the interface instead.
- Zod schemas that extend other schemas via `.extend()` or `.merge()` must not remove or weaken required fields.
- Server Actions that are registered as form actions must always return a value that satisfies the declared return type — never `undefined` on some branches and a typed value on others.
- Custom hooks that wrap built-in React hooks must return the same shape on every render, regardless of internal state.

### Examples

```typescript
// WRONG — CachedUserRepository breaks the contract by silently swallowing errors
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

class CachedUserRepository implements UserRepository {
  async findById(id: string) { return cache.get(id) ?? null; }
  async save(user: User) {
    // silently does nothing if cache is unavailable — LSP violation
    try { cache.set(user.id, user); } catch {}
  }
}

// CORRECT — CachedUserRepository delegates writes to the real implementation
class CachedUserRepository implements UserRepository {
  constructor(private base: UserRepository, private cache: Cache) {}

  async findById(id: string): Promise<User | null> {
    return this.cache.get(id) ?? this.base.findById(id);
  }

  async save(user: User): Promise<void> {
    await this.base.save(user); // contract honored: real save always runs
    this.cache.set(user.id, user);
  }
}
```

---

## 4. Interface Segregation Principle (ISP)

**Clients must not be forced to depend on interfaces they do not use.**

### Rules

- Keep TypeScript interfaces small and focused on a single capability.
- Server Components, Server Actions, and Client Components must only receive the props and dependencies they actually use.
- Do not pass entire service objects or large config objects into components — pass only the data the component needs.
- Avoid "god" service interfaces that accumulate unrelated methods. Split them by domain operation.
- Server Actions must accept the minimum input required for the mutation they perform — not a superset of possible inputs.

### Examples

```typescript
// WRONG — Client Component is forced to depend on the entire user object
interface User {
  id: string;
  email: string;
  passwordHash: string; // sensitive — should never reach the client
  createdAt: Date;
  role: string;
  billingAddress: Address;
}

function UserAvatar({ user }: { user: User }) {
  return <img src={`/avatars/${user.id}`} alt={user.email} />;
}

// CORRECT — component only depends on what it needs
interface AvatarProps {
  userId: string;
  email: string;
}

function UserAvatar({ userId, email }: AvatarProps) {
  return <img src={`/avatars/${userId}`} alt={email} />;
}
```

```typescript
// WRONG — one large service interface
interface UserService {
  getById(id: string): Promise<User>;
  create(data: CreateUser): Promise<User>;
  delete(id: string): Promise<void>;
  sendWelcomeEmail(user: User): Promise<void>;
  exportToCsv(): Promise<string>;
}

// CORRECT — segregated by capability
interface UserReader {
  getById(id: string): Promise<User>;
}

interface UserWriter {
  create(data: CreateUser): Promise<User>;
  delete(id: string): Promise<void>;
}

interface UserNotifier {
  sendWelcomeEmail(user: User): Promise<void>;
}
```

---

## 5. Dependency Inversion Principle (DIP)

**High-level modules must not depend on low-level modules. Both must depend on abstractions.**

### Rules

- Define TypeScript interfaces for all I/O dependencies: database clients, email senders, file storage, payment providers, external APIs.
- Service functions must receive their dependencies through parameters or factory functions — never import the concrete implementation directly inside a service.
- The database client (`db`) must only appear in repository files. Services import repositories; they do not import `db`.
- Server Actions are the composition root for the server layer: they instantiate or import repositories and pass them into service functions.
- Never import server-only modules (repositories, `db`, secrets) into Client Components. Pass only serializable data as props.

### Examples

```typescript
// WRONG — service imports and uses the concrete db client directly
// services/orderService.ts
import { db } from "@/lib/db";
import { ordersTable } from "@/lib/db/schema";

export async function getOrdersForUser(userId: string) {
  return db.query.ordersTable.findMany({
    where: eq(ordersTable.userId, userId),
  });
}

// CORRECT — service depends on an abstraction; repository owns the db dependency
// repositories/orderRepository.ts
import { db } from "@/lib/db";

export interface OrderRepository {
  findByUserId(userId: string): Promise<Order[]>;
}

export class DrizzleOrderRepository implements OrderRepository {
  async findByUserId(userId: string): Promise<Order[]> {
    return db.query.ordersTable.findMany({
      where: eq(ordersTable.userId, userId),
    });
  }
}

// services/orderService.ts  — depends only on the interface
export function createOrderService(repo: OrderRepository) {
  return {
    async getOrdersForUser(userId: string): Promise<Order[]> {
      return repo.findByUserId(userId);
    },
  };
}

// app/orders/actions.ts  — Server Action is the composition root
"use server";
import { DrizzleOrderRepository } from "@/repositories/orderRepository";
import { createOrderService } from "@/services/orderService";

export async function fetchUserOrders(userId: string) {
  const repo = new DrizzleOrderRepository();
  const service = createOrderService(repo);
  return service.getOrdersForUser(userId);
}
```

---

## Project-Specific Conventions

### File Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (routes)/
│   │   └── feature/
│   │       ├── page.tsx        # Server Component — data fetching + layout
│   │       ├── layout.tsx      # Server Component — route layout
│   │       ├── actions.ts      # Server Actions — mutations only ("use server")
│   │       └── FeatureClient.tsx  # Client Component — interactivity ("use client")
│   ├── api/                    # API Route Handlers (Route Handlers)
│   │   └── feature/
│   │       └── route.ts
│   └── middleware.ts           # Edge middleware
├── components/                 # Shared UI components
│   ├── ui/                     # Primitive, stateless components
│   └── [feature]/              # Feature-specific components
├── services/                   # Domain / business logic (server-only)
├── repositories/               # Data-access layer — db queries only (server-only)
├── lib/                        # Cross-cutting concerns
│   ├── db/                     # Drizzle client + schema
│   ├── auth.ts                 # Session/auth helpers
│   └── errors.ts               # Domain error classes
└── types/                      # Shared TypeScript types and interfaces
```

### Server Components

- Default to Server Components for all `page.tsx`, `layout.tsx`, and shared UI that does not require browser APIs.
- Perform all data fetching inside Server Components using `async/await` directly — no `useEffect`, no `fetch` in client code.
- Never pass non-serializable values (functions, class instances, `Date` objects) as props to Client Components.
- Use `React.cache()` to deduplicate identical data-fetching calls within the same render.

```typescript
// app/dashboard/page.tsx — Server Component
import { getUserStats } from "@/services/statsService";
import { StatsChart } from "./StatsChart"; // Client Component

export default async function DashboardPage() {
  const stats = await getUserStats(); // async/await directly in the component
  return <StatsChart data={stats} />;  // only serializable data passes the boundary
}
```

### Client Components

- Add `"use client"` only when the component uses `useState`, `useEffect`, `useReducer`, event handlers, or browser-only APIs.
- Client Components must not import or call repositories, services, or `db` directly.
- Prefer receiving data as props from a parent Server Component over fetching inside the Client Component.
- For mutations, Client Components call Server Actions — they do not make direct `fetch` calls to API routes unless absolutely necessary.

```typescript
// components/SubscribeButton.tsx — Client Component
"use client";
import { useTransition } from "react";
import { subscribeToNewsletter } from "@/app/newsletter/actions";

export function SubscribeButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => subscribeToNewsletter(email))}
    >
      {isPending ? "Subscribing…" : "Subscribe"}
    </button>
  );
}
```

### Server Actions

- Place all Server Actions in a dedicated `actions.ts` file co-located with the route segment that uses them.
- Always add `"use server"` at the top of the file — never inline it in a function inside a component file that also contains rendering logic.
- Validate all input with Zod before executing any business logic. Never trust raw `FormData` or raw arguments.
- Return a typed result object — never throw unhandled errors to the client. Use a `{ success, error, data }` pattern.
- Server Actions are the **only** place where repositories are instantiated or imported outside of API Route Handlers.

```typescript
// app/posts/actions.ts
"use server";
import { z } from "zod";
import { DrizzlePostRepository } from "@/repositories/postRepository";
import { createPostService } from "@/services/postService";
import { requireSession } from "@/lib/auth";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createPost(
  input: unknown
): Promise<ActionResult<Post>> {
  const session = await requireSession();
  const parsed = CreatePostSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  const repo = new DrizzlePostRepository();
  const service = createPostService(repo);

  const post = await service.create({ ...parsed.data, authorId: session.userId });
  return { success: true, data: post };
}
```

### Validation

- All external input (Server Action arguments, API route request bodies, URL search params) must be validated with Zod before use.
- Use `schema.safeParse()` in Server Actions to handle errors gracefully and return structured results.
- Use `schema.parse()` only for trusted internal data where a thrown error is acceptable.
- Define schemas in `types/` or co-located with the feature when they are used in only one place.

### Error Handling

- Define domain error classes (`NotFoundError`, `ForbiddenError`, `ConflictError`) in `lib/errors.ts`.
- Services throw domain errors; Server Actions and API Route Handlers catch them and map to structured responses.
- Never expose raw error messages, stack traces, or database errors to the client.
- Use Next.js `error.tsx` and `not-found.tsx` boundary files to handle rendering errors per route segment.

### TypeScript

- All function parameters and return types must be explicitly typed. No implicit `any`.
- Prefer `interface` for object shapes that will be implemented, extended, or used as contracts.
- Prefer `type` for unions, intersections, mapped types, and aliases.
- Use `unknown` instead of `any` when the type is not known; narrow it explicitly before use.
- Mark server-only modules with `import "server-only"` at the top to prevent accidental import in Client Components.
