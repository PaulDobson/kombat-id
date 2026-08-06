# Implementation Plan: Instructor Onboarding

## Overview

Implement the guided four-step onboarding flow for instructors inside a new bounded context at `src/modules/instructor-onboarding/`. The feature follows Clean Architecture + Screaming Architecture conventions, persists progress in Supabase, and integrates with the existing instructor dashboard. Tasks are ordered to establish the domain and data foundation first, then application logic, infrastructure, presentation, and finally dashboard integration.

---

## Tasks

- [x] 1. Create module skeleton and domain layer
  - Create the full directory tree under `src/modules/instructor-onboarding/` (domain, application, infrastructure, presentation sub-folders)
  - Implement `domain/entities/onboardingProgress.ts`: `OnboardingProgress` interface, `OnboardingStepKey` type, `ONBOARDING_STEP_KEYS` constant, and the three pure helpers `getFirstIncompleteStepIndex`, `isOnboardingComplete`, `completedStepCount`
  - Implement `domain/interfaces/onboardingProgressRepository.ts`: `OnboardingProgressRepository` interface with `findByPractitionerId`, `create`, `markStepComplete`, and `markAllComplete`
  - Implement `domain/errors/onboardingErrors.ts`: `OnboardingProgressNotFoundError` extending `DomainError` from `@/lib/errors`
  - _Requirements: 9.1, 9.2_

  - [ ]\* 1.1 Write property tests for domain pure functions
    - **Property 3: `completed_at` is set if and only if all four steps are true** — use `isOnboardingComplete` against arbitrary boolean combinations
    - **Property 4: Fresh progress record has all steps false** — verify initial state shape
    - **Property 8: Modal opens at the first incomplete step** — `getFirstIncompleteStepIndex` returns the index of the first `false` field in canonical order for any boolean combination
    - **Property 16: Checklist completed count matches sum of true booleans** — `completedStepCount` equals the count of `true` values for any DTO
    - Use `fast-check` with ≥ 100 iterations; no I/O required
    - _Requirements: 1.4, 1.5, 2.7, 7.3, 7.4, 7.5_

- [x] 2. Write the Supabase migration
  - Create `supabase/migrations/045_instructor_onboarding_progress.sql` with the `instructor_onboarding_progress` table definition (all columns, PRIMARY KEY, UNIQUE constraint, foreign key to `practitioners`)
  - Add `ENABLE ROW LEVEL SECURITY` and the three RLS policies: `instructor_read_own_onboarding_progress` (SELECT), `instructor_update_own_onboarding_progress` (UPDATE), `service_role_insert_onboarding_progress` (INSERT)
  - _Requirements: 1.1, 1.2, 1.6_

- [x] 3. Implement infrastructure repository
  - Create `infrastructure/repositories/supabaseOnboardingProgressRepository.ts` with `import "server-only"` at the top
  - Define `OnboardingProgressRowSchema` (Zod) for runtime row validation
  - Implement private `toEntity` and `toRow` mapping functions
  - Implement all four `OnboardingProgressRepository` methods using `adminSupabase` (service-role client): `findByPractitionerId`, `create`, `markStepComplete`, `markAllComplete`
  - _Requirements: 1.2, 1.3, 1.4, 1.6, 9.3_

- [x] 4. Implement application use cases
  - [x] 4.1 Implement `getOrInitOnboardingProgress` use case
    - File: `application/use-cases/getOrInitOnboardingProgress.ts`
    - Calls `repo.findByPractitionerId`; if `null` calls `repo.create`; returns the record
    - _Requirements: 1.5_

  - [x] 4.2 Implement `markStepComplete` use case
    - File: `application/use-cases/markStepComplete.ts`
    - Define and export `MarkStepCompleteInput` Zod schema
    - Call `repo.markStepComplete`; then check `isOnboardingComplete`; if true, call `repo.markAllComplete` with current ISO timestamp
    - _Requirements: 1.3, 1.4_

  - [ ]\* 4.3 Write property test for `markStepComplete` use case
    - **Property 2: Step completion toggles the correct boolean** — for any `OnboardingStepKey`, the returned record has that boolean `true` and previously-false fields unchanged
    - Mock the repository; drive with `fast-check`
    - _Requirements: 1.3_

  - [x] 4.4 Implement `completeOnboarding` use case
    - File: `application/use-cases/completeOnboarding.ts`
    - Delegates to `markStepComplete` with `step: "step_events_info_completed"`
    - _Requirements: 6.3_

- [x] 5. Implement Server Actions
  - Create `presentation/actions/onboardingActions.ts` with `"use server"` directive
  - Implement `createAcademyAndCompleteStepAction`: calls `requireInstructor()`, validates with `AcademyBasicDataSchema` + `AcademyPublicProfileSchema`, creates academy via the existing practitioner-identity module's academy-creation logic with `responsible_instructor_ids` containing the instructor's `practitionerId`, then calls `markStepComplete` use case for `step_create_academy_completed`, and calls `revalidatePath("/instructor")`
  - Implement `selectExistingAcademyAndCompleteStepAction`: calls `requireInstructor()`, validates `{ academyId: z.string().uuid() }`, calls `markStepComplete` use case for `step_create_academy_completed`, calls `revalidatePath("/instructor")`
  - Implement `registerStudentAction`: calls `requireInstructor()`, validates with `RegisterStudentSchema`, creates practitioner record via existing practitioner-identity module, returns `ActionResult<SessionStudent>`
  - Implement `markStepCompleteAction`: calls `requireInstructor()`, validates `{ step: OnboardingStepKey }`, calls `markStepComplete` use case, calls `revalidatePath("/instructor")`
  - Implement `dispatchWelcomeEmailsAction`: calls `requireInstructor()`, validates `{ students: SessionStudent[] }` with Zod, iterates list calling `sendStudentWelcomeEmail` for each student with valid email (catches per-student errors, logs server-side, accumulates `failedCount`), then calls `markStepCompleteAction` for `step_welcome_emails_completed`, calls `revalidatePath("/instructor")`
  - All actions must return `ActionResult<T>` and never expose stack traces or raw DB errors
  - _Requirements: 3.4, 3.6, 3.7, 4.3, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]\* 5.1 Write property tests for Server Action Zod schemas
    - **Property 9: AcademyBasicDataSchema rejects constraint violations** — empty `name`, `name` > 120 chars, invalid `region`, empty `city`, `city` > 80 chars, `address` > 200 chars
    - **Property 10: AcademyPublicProfileSchema rejects constraint violations** — `description` > 1000 chars, `founderStory` > 2000 chars, malformed `contactEmail`, invalid `contactWebsite` URL
    - **Property 12: RegisterStudentSchema rejects constraint violations** — empty `fullName`, `fullName` > 120 chars, malformed `email`, future `birthDate`, invalid `belt`
    - **Property 17: Server Actions return VALIDATION_ERROR for any invalid input** — use `fast-check` to generate invalid inputs for each action's schema
    - _Requirements: 3.2, 3.3, 4.2, 8.4_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement presentation utility types and `OnboardingGate`
  - Define `OnboardingProgressDTO` interface and `SessionStudent` interface in `presentation/components/types.ts` (serialisable shapes for client props)
  - Implement `OnboardingGate` Server Component in `presentation/components/OnboardingGate.tsx` (no directive):
    - Receives `practitionerId` prop
    - Instantiates `SupabaseOnboardingProgressRepository` and calls `getOrInitOnboardingProgress`
    - Returns `null` when `completedAt` is non-null
    - Pre-fetches instructor's existing academies for the `CreateAcademyStep`
    - Converts entity to `OnboardingProgressDTO`
    - Renders `<OnboardingChecklist progressDTO={...} initialOpen={allStepsFalse} instructorAcademies={...} />`
  - _Requirements: 1.5, 2.1, 2.4, 2.5, 8.1_

- [x] 8. Implement `OnboardingStepIndicator` and `OnboardingChecklist` components
  - [x] 8.1 Implement `OnboardingStepIndicator` (`"use client"`)
    - File: `presentation/components/OnboardingStepIndicator.tsx`
    - Pure presentational: receives `currentStep: number` (0-indexed), renders "Paso {currentStep + 1} de 4"
    - _Requirements: 2.2_

  - [ ]\* 8.2 Write property test for `OnboardingStepIndicator`
    - **Property 5: Step indicator renders the correct step number for any step** — for any index in [0, 1, 2, 3], rendered label shows `(index + 1)` and total `4`
    - Use React Testing Library
    - _Requirements: 2.2_

  - [x] 8.3 Implement `OnboardingChecklist` (`"use client"`)
    - File: `presentation/components/OnboardingChecklist.tsx`
    - Props: `progressDTO: OnboardingProgressDTO`, `initialOpen?: boolean`, `instructorAcademies: AcademyOption[]`
    - Local state: `modalOpen`, `activeStep`; on mount sets `modalOpen = true` and `activeStep = getFirstIncompleteStepIndex(...)` when `initialOpen` is true
    - Renders header "Configuración inicial — N/4 pasos completados" where N = `completedStepCount(progressDTO)`
    - Renders four step rows with check icon (completed) or circle icon (pending)
    - Clicking a pending step → `openModalAtStep(index)`; clicking a completed step → `openModalAtStep(getFirstIncompleteStepIndex(progressDTO))`
    - Renders `<OnboardingModal>` when `modalOpen` is true
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]\* 8.4 Write property tests for `OnboardingChecklist`
    - **Property 15: Checklist step indicators match progress booleans** — for any `OnboardingProgressDTO`, renders exactly 4 rows where each row's indicator matches its boolean
    - **Property 16: Checklist completed count matches sum of true booleans** — header count equals `completedStepCount(progressDTO)` for any DTO
    - Use React Testing Library + `fast-check`
    - _Requirements: 7.2, 7.5_

- [x] 9. Implement `OnboardingModal` and form sub-components
  - [x] 9.1 Implement `AcademyBasicDataForm` (`"use client"`)
    - File: `presentation/components/forms/AcademyBasicDataForm.tsx`
    - Controlled form using `react-hook-form` with `@hookform/resolvers/zod` and `AcademyBasicDataSchema`
    - All 16 Chilean region options in the `region` select
    - Inline error messages via `formState.errors` adjacent to invalid fields; form does not close on validation failure
    - Props: `onSubmit: (data: AcademyBasicData) => void`, `isSubmitting: boolean`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 9.2 Implement `AcademyPublicProfileForm` (`"use client"`)
    - File: `presentation/components/forms/AcademyPublicProfileForm.tsx`
    - Controlled form using `react-hook-form` with `AcademyPublicProfileSchema`
    - Inline error messages for all optional fields
    - Props: `onSubmit: (data: AcademyPublicProfile) => void`, `isSubmitting: boolean`, `onBack: () => void`
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [x] 9.3 Implement `CreateAcademyStep` (`"use client"`)
    - File: `presentation/components/steps/CreateAcademyStep.tsx`
    - Local state machine: `"basic"` → `"profile"`
    - Renders `AcademyBasicDataForm` in `"basic"` phase and `AcademyPublicProfileForm` in `"profile"` phase
    - When `instructorAcademies.length > 0`, renders "Seleccionar academia existente" option that calls `selectExistingAcademyAndCompleteStepAction`
    - On final form submission calls `createAcademyAndCompleteStepAction`; on success calls `onComplete()`
    - Props: `instructorAcademies: AcademyOption[]`, `onComplete: () => void`
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8_

  - [x] 9.4 Implement `RegisterStudentsStep` (`"use client"`)
    - File: `presentation/components/steps/RegisterStudentsStep.tsx`
    - Local state: `registeredStudents: SessionStudent[]`
    - Renders inline student registration form (sub-component using `react-hook-form` + `RegisterStudentSchema`)
    - On successful `registerStudentAction` call, appends `SessionStudent` to list and renders confirmation row
    - Inline validation errors adjacent to invalid fields
    - "Continue" button enabled only when `registeredStudents.length > 0`; "Omitir" (skip) button always visible
    - Props: `academyId: string`, `onComplete: (students: SessionStudent[]) => void`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 9.5 Implement `WelcomeEmailsStep` (`"use client"`)
    - File: `presentation/components/steps/WelcomeEmailsStep.tsx`
    - Renders list of students passed as prop
    - "Enviar correos" button calls `dispatchWelcomeEmailsAction`; shows per-student success/warning indicators based on `failedCount`
    - When `students.length === 0`, shows skip-only option
    - Props: `students: SessionStudent[]`, `onComplete: () => void`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 9.6 Implement `EventsInfoStep` (`"use client"`)
    - File: `presentation/components/steps/EventsInfoStep.tsx`
    - Purely informational: title "Próximos eventos y competencias", navigation path description "Accede desde el menú lateral → Eventos"
    - "Finalizar configuración" button calls `markStepCompleteAction({ step: "step_events_info_completed" })`; on success calls `onComplete()`
    - Props: `onComplete: () => void`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.7 Implement `OnboardingModal` (`"use client"`)
    - File: `presentation/components/OnboardingModal.tsx`
    - Full-overlay dialog using Radix UI `Dialog.Root`
    - Local state: `activeStep` (initialised to `initialStep` prop); `sessionStudents: SessionStudent[]` (passed between step 2 and 3)
    - Renders `<OnboardingStepIndicator currentStep={activeStep} />` and the active step component from the `STEPS` routing array
    - On step completion advances `activeStep` by 1; on X button or Escape calls `onClose()` without resetting step state
    - Props: `open`, `onClose`, `initialStep`, `progressDTO`, `instructorAcademies`
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [ ]\* 9.8 Write property tests for `OnboardingModal`
    - **Property 6: Closing the modal preserves completed step state** — for any `OnboardingProgressDTO`, calling `onClose` does not mutate `progressDTO`
    - **Property 7: Step sequence is always fixed** — steps rendered always follow `[CreateAcademy, RegisterStudents, WelcomeEmails, EventsInfo]` order
    - Use React Testing Library + `fast-check`
    - _Requirements: 2.3, 2.6_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integrate `OnboardingGate` into the instructor dashboard
  - Modify `src/app/(dashboard)/instructor/page.tsx`:
    - Add `import { OnboardingGate } from "@/modules/instructor-onboarding/presentation/components/OnboardingGate"`
    - Insert `<OnboardingGate practitionerId={session.practitionerId} />` immediately after the existing page header `<div>`
  - No other changes to the page file
  - _Requirements: 2.1, 2.4, 2.5, 9.1_

  - [ ]\* 11.1 Write unit tests for `OnboardingGate` rendering logic
    - `OnboardingGate` renders `OnboardingChecklist` when `completedAt` is null
    - `OnboardingGate` renders nothing when `completedAt` is non-null
    - Mock `SupabaseOnboardingProgressRepository` and `getOrInitOnboardingProgress`
    - _Requirements: 2.1, 2.4, 2.5_

- [x] 12. Write integration tests for repository and RLS
  - Test `supabaseOnboardingProgressRepository.create` inserts a record with all step booleans `false` and `findByPractitionerId` retrieves it
  - **Property 1: Instructor progress record uniqueness** — concurrent or repeated `getOrInitOnboardingProgress` calls for the same `practitionerId` result in exactly one DB row
  - RLS test: an instructor using the non-admin Supabase client cannot read or update another instructor's record
  - _Requirements: 1.1, 1.5, 1.6_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The `practitionerId` used in all DB operations always originates from `requireInstructor()`, never from client input (security requirement 8.3)
- `SupabaseOnboardingProgressRepository` uses the `adminSupabase` service-role client, consistent with all other repositories in the project
- Temporary student passwords are generated server-side and passed once to `sendStudentWelcomeEmail` — they are never stored in plain text
- All Server Actions follow the mandatory sequence: authenticate → validate → authorize → execute → revalidate
- Property tests use `fast-check` with ≥ 100 iterations, consistent with existing modules
- The steering rules prohibit inline Server Action definitions in component files — all actions live in `presentation/actions/onboardingActions.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2"] },
    { "id": 1, "tasks": ["3", "4.1", "4.2", "4.4"] },
    { "id": 2, "tasks": ["4.3", "5"] },
    { "id": 3, "tasks": ["5.1", "7"] },
    { "id": 4, "tasks": ["8.1", "8.3", "9.1", "9.2"] },
    { "id": 5, "tasks": ["8.2", "8.4", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 6, "tasks": ["9.7", "11"] },
    { "id": 7, "tasks": ["9.8", "11.1", "12"] }
  ]
}
```
