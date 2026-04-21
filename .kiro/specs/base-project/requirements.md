# Requirements — Base Project: Next.js + TypeScript + Supabase

## Overview

Create a production-ready base project using Next.js (App Router), TypeScript, and Supabase (latest version). This project serves as the canonical starting point for any new application. It must include authentication, database access, typed API patterns, and a minimal but complete UI shell — ready to extend without rewriting.

---

## Functional Requirements

### FR-01 — Project Initialization

- The project must be a Next.js application using the **App Router** (`app/` directory).
- TypeScript must be configured in strict mode.
- The project must use `pnpm` as the package manager.
- All dependencies must use their latest stable versions at the time of generation.
- The project must pass `tsc --noEmit` with zero errors after scaffolding.

### FR-02 — Supabase Integration

- The project must integrate **Supabase** using the latest `@supabase/supabase-js` and `@supabase/ssr` packages.
- Supabase clients must be separated into:
  - A **browser client** (`lib/supabase/client.ts`) — used in Client Components.
  - A **server client** (`lib/supabase/server.ts`) — used in Server Components, Server Actions, and Route Handlers. Must use `cookies()` from `next/headers`.
  - A **middleware client** (`lib/supabase/middleware.ts`) — used exclusively in `middleware.ts`.
- The Supabase URL and anon key must be read from environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- The service role key (`SUPABASE_SERVICE_ROLE_KEY`) must be available for admin operations and must never be exposed to the browser.

### FR-03 — Authentication

- Authentication must be implemented using **Supabase Auth**.
- The following flows must be included:
  - Email + password sign-up
  - Email + password sign-in
  - Sign-out
  - Password reset via email (send reset link)
- Session management must use **cookie-based sessions** via `@supabase/ssr`, not `localStorage`.
- The `middleware.ts` file must refresh the session on every request and redirect unauthenticated users away from protected routes.
- A `requireUser()` server-only helper must be available in `lib/supabase/server.ts` that returns the authenticated user or redirects to `/login`.

### FR-04 — Route Structure

The following routes must be created:

| Route                | Type          | Description                                  |
| -------------------- | ------------- | -------------------------------------------- |
| `/`                  | Public        | Landing or redirect page                     |
| `/login`             | Public        | Sign-in form                                 |
| `/register`          | Public        | Sign-up form                                 |
| `/reset-password`    | Public        | Password reset request form                  |
| `/dashboard`         | Protected     | Authenticated home page                      |
| `/dashboard/profile` | Protected     | User profile page                            |
| `/auth/callback`     | Route Handler | Supabase OAuth / email confirmation callback |

- Protected routes must redirect to `/login` if the user has no valid session.
- Authenticated users visiting `/login` or `/register` must be redirected to `/dashboard`.

### FR-05 — Database Access Pattern

- All database access must go through the **Supabase server client** — never the browser client.
- Direct database access from Client Components is forbidden.
- A typed query helper pattern must be established using TypeScript generics.
- The project must include a generated `database.types.ts` file (or a placeholder with instructions to generate it via the Supabase CLI: `supabase gen types typescript`).

### FR-06 — Environment Configuration

The following files must be present:

- `.env.local.example` — lists all required environment variables with placeholder values and comments.
- `.env.local` — must be listed in `.gitignore` and never committed.

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### FR-07 — UI Shell

- The project must include a minimal but functional UI shell using **Tailwind CSS**.
- The following shared UI components must exist:
  - `components/ui/Button.tsx` — primary, secondary, and destructive variants.
  - `components/ui/Input.tsx` — labeled text input with error state.
  - `components/ui/FormMessage.tsx` — success and error message display.
- A `components/layout/Navbar.tsx` Server Component must display:
  - The app name or logo.
  - A sign-out button (visible only when authenticated).
  - Navigation links appropriate to auth state.
- The auth pages (`/login`, `/register`, `/reset-password`) must use a centered card layout.
- The dashboard must use a two-column layout with a sidebar and a main content area.

### FR-08 — Server Actions for Auth

All authentication operations must be implemented as **Server Actions** in `app/auth/actions.ts`:

- `signInAction(formData: FormData)` — signs in with email/password, redirects to `/dashboard` on success.
- `signUpAction(formData: FormData)` — creates a new user, shows a confirmation message.
- `signOutAction()` — signs out the user, redirects to `/login`.
- `resetPasswordAction(formData: FormData)` — sends a password reset email.

Each action must:

- Validate input with Zod before calling Supabase.
- Return a typed `ActionResult` on validation or Supabase errors.
- Never expose Supabase error internals directly to the user — map them to safe messages.

---

## Non-Functional Requirements

### NFR-01 — TypeScript Strictness

- `tsconfig.json` must enable `strict: true`, `noUncheckedIndexedAccess: true`, and `exactOptionalPropertyTypes: true`.
- No `any` types. Use `unknown` and narrow explicitly.
- All function parameters and return types must be explicitly typed.

### NFR-02 — Security

- All rules defined in `.kiro/steering/software-security.md` apply to this project without exception.
- The Supabase service role key must only be used in server-side admin operations and must be accessed exclusively through `lib/supabase/admin.ts` marked with `import "server-only"`.
- Auth state must never be trusted from client-side cookies or request headers directly — always re-verify via the Supabase server client.

### NFR-03 — Rendering Strategy

- All rules defined in `.kiro/steering/nextjs-best-practices.md` apply.
- Server Components are the default. `"use client"` is added only when strictly required by the decision tree.
- Auth forms must be progressively enhanced: they must work as plain HTML forms before JavaScript hydration.

### NFR-04 — Code Structure

- All rules defined in `.kiro/steering/clean-screaming-architecture.md` apply.
- All rules defined in `.kiro/steering/solid-principles.md` apply.
- The folder structure must reflect the business domain — not the framework.

---

## Acceptance Criteria

- [x] `pnpm install` completes with no errors.
- [x] `pnpm run dev` starts the development server with no runtime errors.
- [x] `pnpm run build` produces a successful production build with no TypeScript errors.
- [x] A user can sign up, receive a confirmation email, sign in, and access `/dashboard`.
- [x] Accessing `/dashboard` without a session redirects to `/login`.
- [x] Accessing `/login` with an active session redirects to `/dashboard`.
- [x] Sign-out clears the session and redirects to `/login`.
- [x] No secrets appear in client-side bundles or browser-visible source.
- [x] All Supabase clients use the correct context (browser, server, middleware).
