# Design Document — Instructor Onboarding

## Overview

The instructor-onboarding feature introduces a guided four-step flow that activates automatically on the instructor dashboard whenever `completed_at` is `null`. It lives entirely inside the `src/modules/instructor-onboarding/` bounded context following the project's Clean Architecture + Screaming Architecture conventions. The flow is state-persisted per instructor in Supabase and integrates with three existing systems: the `requireInstructor()` auth guard, the academy-creation logic from `practitioner-identity`, and the `sendStudentWelcomeEmail` utility from `src/lib/email.ts`.

---

## Architecture

### Layer Overview

```
src/modules/instructor-onboarding/
├── domain/
│   ├── entities/
│   │   └── onboardingProgress.ts         # OnboardingProgress entity + step helpers
│   ├── interfaces/
│   │   └── onboardingProgressRepository.ts
│   └── errors/
│       └── onboardingErrors.ts
├── application/
│   └── use-cases/
│       ├── getOrInitOnboardingProgress.ts
│       ├── markStepComplete.ts
│       └── completeOnboarding.ts
├── infrastructure/
│   └── repositories/
│       └── supabaseOnboardingProgressRepository.ts  # import "server-only"
└── presentation/
    ├── actions/
    │   └── onboardingActions.ts                     # "use server"
    └── components/
        ├── OnboardingModal.tsx                      # "use client"
        ├── OnboardingChecklist.tsx                  # "use client"
        ├── OnboardingStepIndicator.tsx              # "use client"
        ├── steps/
        │   ├── CreateAcademyStep.tsx                # "use client"
        │   ├── RegisterStudentsStep.tsx             # "use client"
        │   ├── WelcomeEmailsStep.tsx                # "use client"
        │   └── EventsInfoStep.tsx                  # "use client"
        └── forms/
            ├── AcademyBasicDataForm.tsx             # "use client"
            └── AcademyPublicProfileForm.tsx         # "use client"
```

The instructor dashboard page (`src/app/(dashboard)/instructor/page.tsx`) gains two new imports from the presentation layer: a Server Component wrapper `OnboardingGate` that fetches or initialises the progress record and conditionally renders `OnboardingChecklist` and the modal trigger data as serialisable props.

### Dependency Flow

```
Domain  ←  Application  ←  Infrastructure
                     ↑
              Presentation (actions = composition root)
                     ↑
         app/(dashboard)/instructor/page.tsx
```

`Domain` imports nothing from the project. `Application` imports only from `Domain`. `Infrastructure` imports `adminSupabase` and `Domain` interfaces. `Presentation/actions` is the composition root: it instantiates `SupabaseOnboardingProgressRepository` and calls use cases. Client Components receive only serialisable props.

---

## Data Models

### Database — `instructor_onboarding_progress`

```sql
-- Migration: 045_instructor_onboarding_progress.sql

CREATE TABLE instructor_onboarding_progress (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id                 UUID NOT NULL UNIQUE REFERENCES practitioners(id) ON DELETE CASCADE,
  step_create_academy_completed   BOOLEAN NOT NULL DEFAULT false,
  step_register_students_completed BOOLEAN NOT NULL DEFAULT false,
  step_welcome_emails_completed   BOOLEAN NOT NULL DEFAULT false,
  step_events_info_completed      BOOLEAN NOT NULL DEFAULT false,
  completed_at                    TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE instructor_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Instructors can only read and update their own record
CREATE POLICY "instructor_read_own_onboarding_progress"
  ON instructor_onboarding_progress
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "instructor_update_own_onboarding_progress"
  ON instructor_onboarding_progress
  FOR UPDATE
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Service role can insert (used by the server-side auto-init path)
CREATE POLICY "service_role_insert_onboarding_progress"
  ON instructor_onboarding_progress
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

The `adminSupabase` client (service role) is used in `SupabaseOnboardingProgressRepository` to bypass RLS for server-side reads and writes, consistent with the pattern established throughout the project.

### Domain Entity

```typescript
// domain/entities/onboardingProgress.ts

export type OnboardingStepKey =
  | "step_create_academy_completed"
  | "step_register_students_completed"
  | "step_welcome_emails_completed"
  | "step_events_info_completed";

export const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  "step_create_academy_completed",
  "step_register_students_completed",
  "step_welcome_emails_completed",
  "step_events_info_completed",
] as const;

export interface OnboardingProgress {
  id: string;
  practitionerId: string;
  stepCreateAcademyCompleted: boolean;
  stepRegisterStudentsCompleted: boolean;
  stepWelcomeEmailsCompleted: boolean;
  stepEventsInfoCompleted: boolean;
  completedAt: string | null; // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

/** Returns the index of the first incomplete step (0–3), or -1 if all are complete. */
export function getFirstIncompleteStepIndex(p: OnboardingProgress): number {
  const flags = [
    p.stepCreateAcademyCompleted,
    p.stepRegisterStudentsCompleted,
    p.stepWelcomeEmailsCompleted,
    p.stepEventsInfoCompleted,
  ];
  return flags.findIndex((f) => !f);
}

/** Returns true when all four steps are complete. */
export function isOnboardingComplete(p: OnboardingProgress): boolean {
  return (
    p.stepCreateAcademyCompleted &&
    p.stepRegisterStudentsCompleted &&
    p.stepWelcomeEmailsCompleted &&
    p.stepEventsInfoCompleted
  );
}

/** Returns the count of completed steps (0–4). */
export function completedStepCount(p: OnboardingProgress): number {
  return [
    p.stepCreateAcademyCompleted,
    p.stepRegisterStudentsCompleted,
    p.stepWelcomeEmailsCompleted,
    p.stepEventsInfoCompleted,
  ].filter(Boolean).length;
}
```

### Session-Level Student Record (client state only)

Students registered during Step 2 are held in React state inside `RegisterStudentsStep`. They are passed to `WelcomeEmailsStep` as a serialisable prop. They are not stored as a separate database table — they are practitioner records created immediately upon registration.

```typescript
// Used as client-side prop shape only
export interface SessionStudent {
  practitionerId: string;
  fullName: string;
  email: string;
  temporaryPassword: string;
}
```

---

## Components and Interfaces

### Repository Interface

```typescript
// domain/interfaces/onboardingProgressRepository.ts

import type {
  OnboardingProgress,
  OnboardingStepKey,
} from "../entities/onboardingProgress";

export interface OnboardingProgressRepository {
  findByPractitionerId(
    practitionerId: string,
  ): Promise<OnboardingProgress | null>;
  create(practitionerId: string): Promise<OnboardingProgress>;
  markStepComplete(
    practitionerId: string,
    step: OnboardingStepKey,
  ): Promise<OnboardingProgress>;
  markAllComplete(
    practitionerId: string,
    completedAt: string,
  ): Promise<OnboardingProgress>;
}
```

### ActionResult Type

All Server Actions return the shared `ActionResult<T>` type from `@/lib/types`.

---

## Application Layer — Use Cases

### `getOrInitOnboardingProgress`

Fetches the progress record for a practitioner, creating it with all steps false if it does not exist. This is the only entry point that touches the record on each page load.

```typescript
// application/use-cases/getOrInitOnboardingProgress.ts

export async function getOrInitOnboardingProgress(
  practitionerId: string,
  deps: { repo: OnboardingProgressRepository },
): Promise<OnboardingProgress>;
```

### `markStepComplete`

Marks a single step as complete and conditionally sets `completed_at` if all four steps become true. Called by Server Actions after each step completion event.

```typescript
// application/use-cases/markStepComplete.ts

export const MarkStepCompleteInput = z.object({
  practitionerId: z.string().uuid(),
  step: z.enum([
    "step_create_academy_completed",
    "step_register_students_completed",
    "step_welcome_emails_completed",
    "step_events_info_completed",
  ]),
});

export async function markStepComplete(
  input: MarkStepCompleteInput,
  deps: { repo: OnboardingProgressRepository },
): Promise<OnboardingProgress>;
```

Internally: calls `repo.markStepComplete`, then checks `isOnboardingComplete` on the returned record. If complete, calls `repo.markAllComplete` with the current timestamp.

### `completeOnboarding`

Called at EventsInfo step completion. Marks the final step and sets `completed_at` atomically. Delegates to `markStepComplete` with `step_events_info_completed`.

---

## Infrastructure Layer

### `SupabaseOnboardingProgressRepository`

```typescript
// infrastructure/repositories/supabaseOnboardingProgressRepository.ts
import "server-only";
```

Uses `adminSupabase` (service role) to bypass RLS, consistent with all other repositories in the project. Implements all four `OnboardingProgressRepository` methods with explicit `toEntity` / `toRow` mapping functions. Row schema validated with Zod at runtime via `OnboardingProgressRowSchema`.

Key methods:

- `findByPractitionerId`: `SELECT * WHERE practitioner_id = ?`
- `create`: `INSERT ... RETURNING *` with all step fields defaulting to false
- `markStepComplete`: `UPDATE SET [step] = true, updated_at = now() WHERE practitioner_id = ? RETURNING *`
- `markAllComplete`: `UPDATE SET completed_at = ?, updated_at = now() WHERE practitioner_id = ? RETURNING *`

---

## Presentation Layer

### Server Actions (`presentation/actions/onboardingActions.ts`)

All actions follow the project's mandatory sequence:

1. `requireInstructor()` — authentication
2. `Zod.safeParse()` — input validation
3. Use-case call with injected repository
4. `revalidatePath("/instructor")` on success
5. Return typed `ActionResult<T>`

```typescript
"use server";
import { ActionResult } from "@/lib/types";
```

Actions defined:

| Action                                       | Input                               | Returns                                 | Validates              |
| -------------------------------------------- | ----------------------------------- | --------------------------------------- | ---------------------- |
| `createAcademyAndCompleteStepAction`         | `CreateAcademyInput` (Zod schema)   | `ActionResult<{ academyId: string }>`   | Req 3.4, 3.6, 3.7, 8.4 |
| `selectExistingAcademyAndCompleteStepAction` | `{ academyId: string }`             | `ActionResult`                          | Req 3.8, 8.4           |
| `registerStudentAction`                      | `RegisterStudentInput` (Zod schema) | `ActionResult<SessionStudent>`          | Req 4.3, 8.4           |
| `markStepCompleteAction`                     | `{ step: OnboardingStepKey }`       | `ActionResult<OnboardingProgressDTO>`   | Req 1.3, 8.4           |
| `dispatchWelcomeEmailsAction`                | `{ students: SessionStudent[] }`    | `ActionResult<{ failedCount: number }>` | Req 5.2, 5.5, 8.4      |

`dispatchWelcomeEmailsAction` iterates the student list, calls `sendStudentWelcomeEmail` for each with a valid email, catches per-student errors (logs server-side, accumulates failed count), then calls `markStepCompleteAction` for `step_welcome_emails_completed` regardless of individual failures.

### Zod Schemas

#### `CreateAcademySchema` (BasicData sub-step)

```typescript
const AcademyBasicDataSchema = z.object({
  name: z.string().min(1).max(120),
  region: z.enum([
    "arica_y_parinacota",
    "tarapaca",
    "antofagasta",
    "atacama",
    "coquimbo",
    "valparaiso",
    "metropolitana",
    "ohiggins",
    "maule",
    "nuble",
    "biobio",
    "araucania",
    "los_rios",
    "los_lagos",
    "aysen",
    "magallanes",
  ]),
  city: z.string().min(1).max(80),
  address: z.string().max(200).optional(),
  foundedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
```

#### `AcademyPublicProfileSchema` (PublicProfile sub-step)

```typescript
const chilePhoneRegex = /^(\+56|56)?[\s.-]?(9\d{8}|\d{9})$/;
const e164OrChile = z
  .string()
  .regex(/^(\+?[1-9]\d{1,14}|(\+56|56)?[\s.-]?(9\d{8}|\d{9}))$/)
  .optional();

const AcademyPublicProfileSchema = z.object({
  description: z.string().max(1000).optional(),
  founderStory: z.string().max(2000).optional(),
  contactPhone: e164OrChile,
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactInstagram: z.string().max(100).optional(),
  contactWhatsapp: e164OrChile,
  contactWebsite: z.string().url().optional().or(z.literal("")),
  coverImagePath: z.string().optional(),
});
```

#### `RegisterStudentSchema`

```typescript
const RegisterStudentSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => new Date(d) < new Date(), {
      message: "La fecha debe ser pasada",
    }),
  belt: z.enum(["white", "yellow", "green", "blue", "red", "black"]).optional(),
  academyId: z.string().uuid(),
});
```

### Components

#### `OnboardingGate` (Server Component — no directive)

Placed in `src/app/(dashboard)/instructor/page.tsx` immediately after the existing header. It:

1. Receives `practitionerId` from the page's `requireInstructor()` call.
2. Instantiates `SupabaseOnboardingProgressRepository` and calls `getOrInitOnboardingProgress`.
3. If `completedAt` is non-null, returns null (no children rendered).
4. Converts the domain entity to a serialisable `OnboardingProgressDTO` (all timestamps as strings).
5. Renders `<OnboardingChecklist progressDTO={...} />`.
6. Passes `initialOpen={true}` only when this is the first-ever load (all steps false).

```typescript
// presentation/components/OnboardingGate.tsx
// Server Component — no "use client"
export async function OnboardingGate({
  practitionerId,
}: {
  practitionerId: string;
});
```

#### `OnboardingProgressDTO` (serialisable shape passed to Client Components)

```typescript
export interface OnboardingProgressDTO {
  stepCreateAcademyCompleted: boolean;
  stepRegisterStudentsCompleted: boolean;
  stepWelcomeEmailsCompleted: boolean;
  stepEventsInfoCompleted: boolean;
  completedAt: string | null;
}
```

#### `OnboardingChecklist` (`"use client"`)

Rendered below the header on the instructor dashboard when `completedAt` is null. Receives `progressDTO` as a prop. Manages `modalOpen` and `activeStep` in local state. On mount, if `initialOpen` prop is true, sets `modalOpen = true` and `activeStep = getFirstIncompleteStepIndex(...)`.

Props:

```typescript
interface OnboardingChecklistProps {
  progressDTO: OnboardingProgressDTO;
  initialOpen?: boolean;
}
```

Renders:

- Header: "Configuración inicial — N/4 pasos completados"
- Four step rows, each showing a check icon (completed) or a circle icon (pending)
- Clicking any row triggers `openModalAtStep(index)`: pending step → open at that step; completed step → open at `getFirstIncompleteStepIndex(progressDTO)`.
- Renders `<OnboardingModal>` when `modalOpen` is true.

#### `OnboardingModal` (`"use client"`)

Full-overlay dialog using Radix UI `Dialog.Root`. Manages `activeStep` internally (initialised to prop value). Displays `OnboardingStepIndicator` and the active step component.

Props:

```typescript
interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  initialStep: number; // 0-indexed
  progressDTO: OnboardingProgressDTO;
  instructorAcademies: AcademyOption[]; // pre-fetched by OnboardingGate
}
```

Step routing:

```typescript
const STEPS = [
  { key: "step_create_academy_completed", component: CreateAcademyStep },
  { key: "step_register_students_completed", component: RegisterStudentsStep },
  { key: "step_welcome_emails_completed", component: WelcomeEmailsStep },
  { key: "step_events_info_completed", component: EventsInfoStep },
] as const;
```

On step completion, calls the corresponding Server Action, then advances `activeStep` by 1. On close (X button or Escape), calls `onClose()` without resetting any step state.

#### `OnboardingStepIndicator` (`"use client"`)

Displays "Paso N de 4". Pure presentational — receives `currentStep` (0-indexed) as a prop.

#### `CreateAcademyStep` (`"use client"`)

Two-phase local state machine: `"basic"` → `"profile"`. Renders `AcademyBasicDataForm` in phase `"basic"` and `AcademyPublicProfileForm` in phase `"profile"`. On final submission calls `createAcademyAndCompleteStepAction`. If `instructorAcademies.length > 0`, renders a "Seleccionar academia existente" option that calls `selectExistingAcademyAndCompleteStepAction`.

#### `RegisterStudentsStep` (`"use client"`)

Maintains a `registeredStudents: SessionStudent[]` list in state. Renders `RegisterStudentForm` (sub-component). On successful registration, appends the returned `SessionStudent` to the list and re-renders the confirmation rows. Exposes a `onComplete(students: SessionStudent[])` callback that the parent modal calls when the instructor clicks Continue.

#### `WelcomeEmailsStep` (`"use client"`)

Receives `students: SessionStudent[]` as a prop (passed from the modal's state after Step 2). Renders the student list and a "Enviar correos" button. On confirm, calls `dispatchWelcomeEmailsAction`. Displays per-student success/warning indicators. If `students.length === 0`, shows skip-only option.

#### `EventsInfoStep` (`"use client"`)

Purely informational. Displays:

- Title: "Próximos eventos y competencias"
- Description of the events section and how to find it: "Accede desde el menú lateral → Eventos"
- A "Finalizar configuración" button that calls `markStepCompleteAction({ step: "step_events_info_completed" })`.

#### `AcademyBasicDataForm` and `AcademyPublicProfileForm` (`"use client"`)

Controlled forms using `react-hook-form` with Zod resolver (`@hookform/resolvers/zod`). Inline error messages rendered adjacent to invalid fields via `react-hook-form`'s `formState.errors`. Both forms are contained within the parent step component and never navigate away on validation failure.

---

## Dashboard Integration

The existing `src/app/(dashboard)/instructor/page.tsx` is updated minimally:

```typescript
// After requireInstructor() and before the return statement
// Add one server-component import:
import { OnboardingGate } from "@/modules/instructor-onboarding/presentation/components/OnboardingGate";

// Inside the JSX, immediately after the header <div>:
<OnboardingGate practitionerId={session.practitionerId} />
```

`OnboardingGate` is self-contained: it fetches its own data, handles the auto-init, and renders nothing once `completedAt` is set. The rest of the page is untouched.

---

## Error Handling

### Domain Errors

```typescript
// domain/errors/onboardingErrors.ts
import { DomainError } from "@/lib/errors";

export class OnboardingProgressNotFoundError extends DomainError {
  constructor(practitionerId: string) {
    super(`Onboarding progress not found for practitioner ${practitionerId}`);
  }
}
```

### Server Action Error Mapping

| Thrown by                         | Caught as    | Returned `code`                         |
| --------------------------------- | ------------ | --------------------------------------- |
| Zod `safeParse` failure           | —            | `"VALIDATION_ERROR"`                    |
| `OnboardingProgressNotFoundError` | Domain error | `"NOT_FOUND"`                           |
| Any other `Error`                 | Unexpected   | `"INTERNAL_ERROR"` (logged server-side) |

Server Actions never surface stack traces, raw Supabase errors, or internal IDs to the client. All unexpected errors are caught, logged with `console.error("[actionName]", err)`, and a generic message is returned.

---

## Security Considerations

- Every Server Action calls `requireInstructor()` as the first statement.
- The `practitionerId` used for all DB reads and writes always comes from `requireInstructor()`, never from client input.
- `SupabaseOnboardingProgressRepository` is marked `import "server-only"` and must never be imported inside any Client Component.
- RLS policies ensure that even if the `adminSupabase` client were not used, direct Supabase client calls would be scoped to the authenticated instructor's own record.
- Temporary passwords for student accounts are generated server-side via `crypto.randomUUID()` combined with a short random alphanumeric suffix and are never stored in plain text in the database (they are only passed once to `sendStudentWelcomeEmail` and discarded).
- `dispatchWelcomeEmailsAction` validates the student list input with Zod before iterating, preventing injection of arbitrary email targets.

---

## Component Tree Summary

```
instructor/page.tsx  (Server Component)
└── OnboardingGate   (Server Component — renders if completedAt is null)
    └── OnboardingChecklist  ("use client")
        └── OnboardingModal  ("use client")
            ├── OnboardingStepIndicator  ("use client")
            └── [active step component]
                ├── CreateAcademyStep  ("use client")
                │   ├── AcademyBasicDataForm  ("use client")
                │   └── AcademyPublicProfileForm  ("use client")
                ├── RegisterStudentsStep  ("use client")
                ├── WelcomeEmailsStep  ("use client")
                └── EventsInfoStep  ("use client")
```

All Client Components receive only serialisable props (strings, booleans, plain objects). No `Date` instances, class instances, or functions cross the server–client boundary.

---

## Testing Strategy

### Unit Tests (Example-Based)

- `OnboardingGate` renders `OnboardingChecklist` when `completedAt` is null and nothing when it is non-null.
- `OnboardingModal` renders the step indicator with the correct current/total numbers.
- Closing the modal via the X button calls `onClose()` without modifying any progress state.
- `CreateAcademyStep` renders the "select existing academy" affordance only when `instructorAcademies.length > 0`.
- `RegisterStudentsStep` shows the Continue button enabled only after at least one student is registered.
- `WelcomeEmailsStep` shows only a skip option when the student list is empty.
- `EventsInfoStep` renders the navigation path description and the completion button.
- Server Action `dispatchWelcomeEmailsAction` logs errors server-side when `sendStudentWelcomeEmail` throws, and returns `failedCount > 0` without blocking step completion.

### Property-Based Tests

Each correctness property listed in the section below maps directly to a property-based test. Tests use `fast-check` (already used in similar modules in the project) with a minimum of 100 iterations per property. Test tags follow the format:

**Feature: instructor-onboarding, Property N: {property_text}**

Pure domain functions (`getFirstIncompleteStepIndex`, `isOnboardingComplete`, `completedStepCount`) and Zod schemas are the primary targets because they are pure, have a large input space, and run in-memory at negligible cost. UI component properties are tested with React Testing Library.

### Integration Tests

- RLS policy: an instructor cannot read or update another instructor's `instructor_onboarding_progress` record when using the non-admin Supabase client.
- `supabaseOnboardingProgressRepository.create` inserts a record and `findByPractitionerId` retrieves it with all step booleans false.
- End-to-end: completing all four steps sets `completed_at` and hides the checklist on the next page load.

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Instructor progress record uniqueness

_For any_ `practitionerId`, after any number of `getOrInitOnboardingProgress` calls (including concurrent ones), exactly one `instructor_onboarding_progress` record with that `practitioner_id` must exist in the database.

**Validates: Requirements 1.1, 1.5**

---

### Property 2: Step completion toggles the correct boolean

_For any_ `OnboardingStepKey` value and any progress record, calling `markStepComplete` with that key must return a record where that specific boolean field is `true` and all other previously-false fields remain unchanged.

**Validates: Requirements 1.3**

---

### Property 3: `completed_at` is set if and only if all four steps are true

_For any_ `OnboardingProgress` record, `completedAt` is non-null if and only if all four step boolean fields are `true`. This invariant must hold after every write operation.

**Validates: Requirements 1.4, 6.3**

---

### Property 4: Fresh progress record has all steps false

_For any_ `practitionerId` that has no existing progress record, calling `getOrInitOnboardingProgress` must return a record where all four step booleans are `false` and `completedAt` is `null`.

**Validates: Requirements 1.5**

---

### Property 5: Step indicator renders the correct step number for any step

_For any_ step index in `[0, 1, 2, 3]`, the `OnboardingStepIndicator` component must render the label showing `(index + 1)` as the current step and `4` as the total.

**Validates: Requirements 2.2**

---

### Property 6: Closing the modal preserves completed step state

_For any_ `OnboardingProgressDTO` with any combination of completed steps, dismissing the `OnboardingModal` (calling `onClose`) must not change the set of completed step booleans — i.e., the `progressDTO` must remain referentially equivalent to its pre-close state.

**Validates: Requirements 2.3**

---

### Property 7: Step sequence is always fixed

_For any_ rendered `OnboardingModal`, the sequence of steps presented must always be `[CreateAcademy, RegisterStudents, WelcomeEmails, EventsInfo]` regardless of the current progress state.

**Validates: Requirements 2.6**

---

### Property 8: Modal opens at the first incomplete step

_For any_ `OnboardingProgressDTO` with at least one incomplete step, `getFirstIncompleteStepIndex` must return the index of the first `false` step boolean in the canonical order `[stepCreateAcademy, stepRegisterStudents, stepWelcomeEmails, stepEventsInfo]`.

**Validates: Requirements 2.7, 7.3, 7.4**

---

### Property 9: AcademyBasicDataSchema rejects constraint violations

_For any_ object that violates at least one `AcademyBasicDataSchema` constraint (e.g., empty `name`, `name` length > 120, invalid `region`, empty `city`, `city` length > 80, `address` length > 200), `AcademyBasicDataSchema.safeParse(object)` must return `{ success: false }`.

**Validates: Requirements 3.2**

---

### Property 10: AcademyPublicProfileSchema rejects constraint violations

_For any_ object that violates at least one `AcademyPublicProfileSchema` constraint (e.g., `description` length > 1000, `founderStory` length > 2000, malformed `contactEmail`, invalid URL for `contactWebsite`), `AcademyPublicProfileSchema.safeParse(object)` must return `{ success: false }`.

**Validates: Requirements 3.3**

---

### Property 11: Created academy always contains the instructor's practitionerId

_For any_ valid `AcademyFormData` and any `practitionerId`, the academy entity constructed by `createAcademyAndCompleteStepAction` must include `practitionerId` in its `responsible_instructor_ids` array.

**Validates: Requirements 3.6**

---

### Property 12: RegisterStudentSchema rejects constraint violations

_For any_ object that violates at least one `RegisterStudentSchema` constraint (e.g., empty `fullName`, `fullName` length > 120, malformed `email`, future `birthDate`, invalid `belt` value), `RegisterStudentSchema.safeParse(object)` must return `{ success: false }`.

**Validates: Requirements 4.2**

---

### Property 13: Welcome email dispatch is called for every student with a valid email

_For any_ list of `SessionStudent` records, `dispatchWelcomeEmailsAction` must invoke `sendStudentWelcomeEmail` exactly once for each student whose `email` field satisfies `z.string().email()`, and must not invoke it for students with invalid or empty email addresses.

**Validates: Requirements 5.2**

---

### Property 14: `step_welcome_emails_completed` is set regardless of email delivery outcome

_For any_ combination of `sendStudentWelcomeEmail` success or failure outcomes across the student list, `dispatchWelcomeEmailsAction` must mark `step_welcome_emails_completed` as `true` after the dispatch loop completes.

**Validates: Requirements 5.5**

---

### Property 15: Checklist step indicators match progress booleans

_For any_ `OnboardingProgressDTO`, the `OnboardingChecklist` component must render exactly 4 step rows where each row's visual indicator (completed/pending) matches the corresponding boolean value in the DTO.

**Validates: Requirements 7.2**

---

### Property 16: Checklist completed count matches sum of true booleans

_For any_ `OnboardingProgressDTO`, the count displayed in the `OnboardingChecklist` header must equal the count of `true` values across the four step boolean fields (i.e., `completedStepCount(progressDTO)`).

**Validates: Requirements 7.5**

---

### Property 17: Server Actions return VALIDATION_ERROR for any invalid input

_For any_ input object that fails the Zod schema for a given Server Action (`markStepCompleteAction`, `registerStudentAction`, `createAcademyAndCompleteStepAction`, `dispatchWelcomeEmailsAction`), the action must return `{ success: false, code: "VALIDATION_ERROR" }` without executing any database operation.

**Validates: Requirements 8.4**
