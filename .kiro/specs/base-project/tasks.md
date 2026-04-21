# Implementation Plan: Base Project — Next.js + TypeScript + Supabase

## Overview

Scaffold a production-ready Next.js base project with Supabase auth, strict TypeScript, Clean Architecture folder structure, and a minimal UI shell. Tasks build incrementally — each step integrates into the previous before moving forward.

## Tasks

- [x] 1. Project initialization and configuration
  - Run `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm`
  - Replace generated `tsconfig.json` with strict config: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` all enabled
  - Clear boilerplate from `app/page.tsx` and `app/globals.css`
  - Create `next.config.ts` with security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy`
  - Add `.env.local` to `.gitignore`
  - _Requirements: FR-01, NFR-01, NFR-02_

- [x] 2. Environment configuration and type scaffolding
  - [x] 2.1 Create `.env.local.example` with all three required variables and inline comments explaining each
    - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
    - _Requirements: FR-06_
  - [x] 2.2 Create `src/lib/config.ts` marked with `import "server-only"` containing a `requireEnv(name)` helper that throws a descriptive error if the variable is absent
    - _Requirements: FR-06, NFR-02_
  - [x] 2.3 Create `src/types/database.types.ts` as a placeholder with a comment instructing how to regenerate via `supabase gen types typescript`
    - Export `type Database = Record<string, unknown>` as the placeholder
    - _Requirements: FR-05_
  - [x] 2.4 Create `src/types/auth.types.ts` with the `ActionResult` union type used by all Server Actions
    - `type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }`
    - _Requirements: FR-08_

- [x] 3. Supabase client implementations
  - [x] 3.1 Install `@supabase/supabase-js` and `@supabase/ssr`
    - _Requirements: FR-02_
  - [x] 3.2 Create `src/lib/supabase/client.ts` — browser client using `createBrowserClient<Database>` from `@supabase/ssr`
    - Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - No `import "server-only"` — this file is intentionally browser-safe
    - _Requirements: FR-02_
  - [x] 3.3 Create `src/lib/supabase/server.ts` — server client using `createServerClient<Database>` with `cookies()` from `next/headers`
    - Mark with `import "server-only"`
    - Implement `requireUser()`: calls `supabase.auth.getUser()`, redirects to `/login` on failure, returns the user on success
    - _Requirements: FR-02, FR-03_
  - [x] 3.4 Create `src/lib/supabase/admin.ts` — service role client using `createClient` from `@supabase/supabase-js`
    - Mark with `import "server-only"`
    - Use `requireEnv("SUPABASE_SERVICE_ROLE_KEY")` — never `NEXT_PUBLIC_` prefix
    - Disable `autoRefreshToken` and `persistSession`
    - _Requirements: FR-02, NFR-02_
  - [x] 3.5 Create `src/lib/supabase/middleware.ts` — `updateSession(request, response)` function using `createServerClient` that reads cookies from the request and writes them to the response
    - _Requirements: FR-02, FR-03_

- [x] 4. Checkpoint — verify Supabase clients compile cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Middleware and route protection
  - [x] 5.1 Create `src/middleware.ts` implementing session refresh and route guards
    - Call `updateSession()` on every matched request
    - Redirect authenticated users from `/login`, `/register`, `/reset-password` → `/dashboard`
    - Redirect unauthenticated users from any non-public route → `/login`
    - Define `matcher` to exclude `_next/static`, `_next/image`, `favicon.ico`, and image file extensions
    - _Requirements: FR-03, FR-04_
  - [ ]\* 5.2 Write property test for middleware route guard logic
    - **Property 1: Unauthenticated access to any protected route always redirects to `/login`**
    - **Validates: Requirements FR-03, FR-04**
  - [ ]\* 5.3 Write property test for authenticated redirect logic
    - **Property 2: Authenticated users visiting any auth route always redirect to `/dashboard`**
    - **Validates: Requirements FR-04**

- [x] 6. Auth validation schemas
  - [x] 6.1 Install `zod`
    - _Requirements: FR-08, NFR-01_
  - [x] 6.2 Create `src/lib/validations/auth.ts` with `SignInSchema`, `SignUpSchema`, and `ResetPasswordSchema`
    - `SignInSchema`: email + password min 6 chars
    - `SignUpSchema`: email + password min 8 chars + `confirmPassword` with `.refine()` equality check
    - `ResetPasswordSchema`: email only
    - Export inferred TypeScript types for each schema
    - _Requirements: FR-08_
  - [ ]\* 6.3 Write property test for auth validation schemas
    - **Property 3: Any input missing required fields always fails validation**
    - **Property 4: `SignUpSchema` with mismatched passwords always fails validation**
    - **Validates: Requirements FR-08**

- [x] 7. Auth Server Actions
  - [x] 7.1 Create `src/app/auth/actions.ts` with `"use server"` at the top
    - Implement `signInAction(formData)`: parse with `SignInSchema.safeParse`, call `signInWithPassword`, redirect to `/dashboard` on success, return `{ error }` on failure — never expose raw Supabase error strings
    - Implement `signUpAction(formData)`: parse with `SignUpSchema.safeParse`, call `signUp` with `emailRedirectTo`, return `{ success }` message on success
    - Implement `signOutAction()`: call `signOut`, `revalidatePath("/", "layout")`, redirect to `/login`
    - Implement `resetPasswordAction(formData)`: parse with `ResetPasswordSchema.safeParse`, call `resetPasswordForEmail`, return `{ success }` message
    - All actions call `revalidatePath("/", "layout")` after mutations that affect session state
    - _Requirements: FR-08_
  - [x] 7.2 Create `src/app/auth/callback/route.ts` — Route Handler that exchanges the Supabase `code` query param for a session via `supabase.auth.exchangeCodeForSession()` and redirects to `/dashboard`
    - _Requirements: FR-04_
  - [ ]\* 7.3 Write unit tests for auth Server Actions
    - Test that validation errors return `{ error }` without calling Supabase
    - Test that Supabase errors are mapped to safe user-facing messages
    - _Requirements: FR-08_

- [x] 8. Checkpoint — verify auth flow compiles and middleware works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Auth pages
  - [x] 10.1 Create `src/app/(auth)/layout.tsx` — centered card layout, no sidebar, minimal header with app name
    - _Requirements: FR-04, FR-07_
  - [x] 10.2 Create `src/app/(auth)/login/page.tsx` as a Server Component
    - Plain HTML `<form action={signInAction}>` with email and password inputs using `Input` component
    - Renders `FormMessage` for errors; links to `/register` and `/reset-password`
    - _Requirements: FR-03, FR-04, NFR-03_
  - [x] 10.3 Create `src/app/(auth)/register/page.tsx` as a Server Component
    - Plain HTML `<form action={signUpAction}>` with email, password, confirmPassword inputs
    - Renders `FormMessage` for success or error
    - _Requirements: FR-03, FR-04, NFR-03_
  - [x] 10.4 Create `src/app/(auth)/reset-password/page.tsx` as a Server Component
    - Plain HTML `<form action={resetPasswordAction}>` with email input
    - Renders `FormMessage` for success or error
    - _Requirements: FR-03, FR-04, NFR-03_

- [x] 11. Dashboard pages
  - [x] 11.1 Create `src/app/(dashboard)/layout.tsx` as a Server Component
    - Call `requireUser()` at the top to protect the entire route group
    - Render `Navbar` and a two-column layout: `Sidebar` on the left, `{children}` in the main area
    - _Requirements: FR-03, FR-04, FR-07_
  - [x] 11.2 Create `src/app/(dashboard)/dashboard/page.tsx` as a Server Component
    - Call `requireUser()` and display a welcome message with the user's email
    - _Requirements: FR-04_
  - [x] 11.3 Create `src/app/(dashboard)/dashboard/profile/page.tsx` as a Server Component
    - Call `requireUser()` and display the user's email, ID, and `created_at` (formatted as ISO string for serialization)
    - _Requirements: FR-04_

- [x] 12. Root layout and root page
  - [x] 12.1 Update `src/app/layout.tsx` — root layout with `<html>`, `<body>`, `globals.css` import, and `<Navbar />` rendered at the root level
    - _Requirements: FR-07_
  - [x] 12.2 Update `src/app/globals.css` — Tailwind directives (`@tailwind base/components/utilities`) and CSS custom properties for the color palette
    - _Requirements: FR-07_
  - [x] 12.3 Update `src/app/page.tsx` — check session server-side via `createClient()`, redirect to `/dashboard` if authenticated, redirect to `/login` if not
    - _Requirements: FR-04_

- [x] 13. Final checkpoint — full build and integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All Server Actions follow the auth-first pattern: validate input → call Supabase → map errors to safe messages → revalidate/redirect
- `import "server-only"` is required on `lib/supabase/server.ts`, `lib/supabase/admin.ts`, and `lib/config.ts`
- Auth pages use plain HTML forms for progressive enhancement — no `"use client"` on page files
- The `(auth)` and `(dashboard)` route groups use parentheses so they don't appear in the URL
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
