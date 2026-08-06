# Requirements Document

## Introduction

This feature introduces a guided onboarding flow for the instructor profile in Kombat ID. When an instructor logs in for the first time, a welcome modal appears automatically and walks the instructor through four sequential steps: creating an academy (basic data + full public profile), registering students, sending automatic welcome emails per registered student, and reviewing the events section. Progress is persisted in Supabase per instructor so the flow survives across sessions and devices. If the instructor closes the modal before completing all steps, a mini-checklist widget remains visible on the dashboard and the modal reappears on subsequent logins until all steps are marked complete.

The feature is a new bounded context located at `src/modules/instructor-onboarding/` and integrates with the existing instructor dashboard at `src/app/(dashboard)/instructor/page.tsx`, the `requireInstructor()` auth guard, and the existing `sendStudentWelcomeEmail` utility in `src/lib/email.ts`.

---

## Glossary

- **Onboarding**: The guided first-session experience that walks an instructor through the four required setup steps.
- **OnboardingProgress**: The Supabase-persisted record that tracks which steps have been completed for a given instructor practitioner.
- **OnboardingModal**: The full-screen or overlay modal presented automatically on the instructor dashboard when onboarding is incomplete.
- **OnboardingChecklist**: The persistent mini-checklist widget shown on the instructor dashboard while onboarding is incomplete, providing quick access to resume any pending step.
- **OnboardingStep**: One of the four discrete phases of the onboarding: (1) CreateAcademy, (2) RegisterStudents, (3) WelcomeEmails, (4) EventsInfo.
- **AcademyForm**: The multi-step form embedded within the CreateAcademy onboarding step that collects basic academy data and public profile data.
- **Instructor**: A practitioner with the role `instructor`, `profesor`, or `maestro` as returned by `requireInstructor()`.
- **InstructorSession**: The authenticated session object returned by `requireInstructor()`, containing `userId`, `practitionerId`, `fullName`, and `role`.
- **WelcomeEmail**: The automated email sent to a student via `sendStudentWelcomeEmail` upon registration through the onboarding step.
- **System**: The Kombat ID web application.

---

## Requirements

### Requirement 1 — Onboarding Progress Persistence

**User Story:** As an instructor, I want my onboarding progress to be saved in the database, so that I can resume from where I left off if I close the browser or switch devices.

#### Acceptance Criteria

1. THE System SHALL store a single `instructor_onboarding_progress` record per instructor, identified by `practitioner_id`, in Supabase.
2. THE System SHALL include the following fields in each `instructor_onboarding_progress` record: `id` (UUID), `practitioner_id` (UUID, unique, references practitioners), `step_create_academy_completed` (boolean, default false), `step_register_students_completed` (boolean, default false), `step_welcome_emails_completed` (boolean, default false), `step_events_info_completed` (boolean, default false), `completed_at` (timestamptz, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
3. WHEN an instructor completes a step, THE System SHALL update the corresponding boolean field to `true` and set `updated_at` to the current timestamp within 500 ms of the step completion event.
4. WHEN all four step completion fields are `true`, THE System SHALL set `completed_at` to the current timestamp.
5. IF a `instructor_onboarding_progress` record does not exist for an authenticated instructor, THEN THE System SHALL create the record automatically with all step fields set to `false` before rendering the instructor dashboard.
6. THE System SHALL enforce a Row-Level Security policy on `instructor_onboarding_progress` so that each instructor can only read and update the record where `practitioner_id` matches the authenticated practitioner's ID.

---

### Requirement 2 — Onboarding Modal Presentation

**User Story:** As an instructor, I want a welcome modal to appear automatically when I first log in, so that I am guided through the setup steps without needing to find them on my own.

#### Acceptance Criteria

1. WHEN an instructor navigates to the instructor dashboard and `completed_at` is `null`, THE System SHALL render the OnboardingModal as the top-most overlay on the page.
2. THE System SHALL display the OnboardingModal with a step indicator showing the current step number (1–4) and the total number of steps (4).
3. WHEN the instructor closes the OnboardingModal before completing all steps, THE System SHALL dismiss the modal without resetting any previously completed step.
4. WHILE onboarding is incomplete (`completed_at` is `null`), THE System SHALL render the OnboardingChecklist widget on the instructor dashboard on every subsequent page load.
5. WHEN `completed_at` is not `null`, THE System SHALL neither render the OnboardingModal nor the OnboardingChecklist widget on the instructor dashboard.
6. THE System SHALL present the four OnboardingSteps in the fixed sequence: CreateAcademy → RegisterStudents → WelcomeEmails → EventsInfo.
7. WHEN the instructor reopens the OnboardingModal from the OnboardingChecklist, THE System SHALL navigate directly to the first incomplete step.

---

### Requirement 3 — Step 1: Create Academy

**User Story:** As an instructor, I want to create my academy with its full public profile during onboarding, so that the academy landing page is ready for visitors after setup.

#### Acceptance Criteria

1. THE System SHALL embed an AcademyForm within the CreateAcademy onboarding step that is divided into two sub-steps: BasicData and PublicProfile.
2. THE System SHALL require the following fields in the BasicData sub-step: `name` (non-empty string, max 120 characters), `region` (one of the 16 valid Chilean regions defined in the Academy entity), `city` (non-empty string, max 80 characters), `address` (string, max 200 characters, optional), `foundedDate` (ISO date string YYYY-MM-DD, optional).
3. THE System SHALL require the following fields in the PublicProfile sub-step: `description` (string, max 1000 characters, optional), `founderStory` (string, max 2000 characters, optional), `contactPhone` (string matching E.164 format or local Chilean format, optional), `contactEmail` (valid email format, optional), `contactInstagram` (string, max 100 characters, optional), `contactWhatsapp` (string matching E.164 format or local Chilean format, optional), `contactWebsite` (valid URL format, optional), `coverImagePath` (URL or storage path string, optional).
4. WHEN the instructor submits the AcademyForm, THE System SHALL validate all fields using Zod before persisting the record.
5. IF validation fails on any AcademyForm field, THEN THE System SHALL display an inline error message adjacent to the invalid field without closing the AcademyForm.
6. WHEN the AcademyForm is submitted successfully, THE System SHALL create the academy record in the `academies` table with `responsible_instructor_ids` containing the instructor's `practitionerId`.
7. WHEN the academy is created successfully, THE System SHALL mark `step_create_academy_completed` as `true` and advance the OnboardingModal to the RegisterStudents step.
8. WHERE the instructor already has at least one academy, THE System SHALL allow the instructor to skip the CreateAcademy step by selecting an existing academy.

---

### Requirement 4 — Step 2: Register Students

**User Story:** As an instructor, I want to register my students during onboarding, so that they are enrolled in the system and linked to my academy from day one.

#### Acceptance Criteria

1. THE System SHALL present a student registration form within the RegisterStudents onboarding step that accepts one student record at a time.
2. THE System SHALL require the following fields per student registration: `fullName` (non-empty string, max 120 characters), `email` (valid email format), `birthDate` (ISO date string YYYY-MM-DD, must be a date in the past), `belt` (one of the valid belt grades defined in the practitioner domain, optional), `academyId` (UUID, pre-selected from the academy created or selected in Step 1).
3. WHEN the instructor submits a student registration form, THE System SHALL validate all fields with Zod before creating the practitioner record.
4. IF validation fails on any student registration field, THEN THE System SHALL display an inline error message adjacent to the invalid field without navigating away from the RegisterStudents step.
5. WHEN a student is registered successfully, THE System SHALL display a confirmation row in the step showing the registered student's `fullName` and `email`.
6. THE System SHALL allow the instructor to register multiple students sequentially within the RegisterStudents step without leaving the onboarding flow.
7. WHEN at least one student has been registered, THE System SHALL enable the "Continue" control to advance to the WelcomeEmails step.
8. THE System SHALL allow the instructor to skip the RegisterStudents step and advance to the WelcomeEmails step without registering any students.
9. WHEN the instructor advances past the RegisterStudents step, THE System SHALL mark `step_register_students_completed` as `true`.

---

### Requirement 5 — Step 3: Welcome Emails

**User Story:** As an instructor, I want welcome emails to be sent automatically to each registered student, so that they receive their access credentials without manual effort from me.

#### Acceptance Criteria

1. WHEN the instructor arrives at the WelcomeEmails step, THE System SHALL display a list of all students registered in the preceding RegisterStudents step of the current onboarding session.
2. WHEN the instructor confirms the email dispatch on the WelcomeEmails step, THE System SHALL call `sendStudentWelcomeEmail` for each student in the session list that has a valid email address.
3. THE System SHALL pass each student's `email`, `fullName`, and a system-generated temporary password to `sendStudentWelcomeEmail`.
4. IF `sendStudentWelcomeEmail` throws an error for a student, THEN THE System SHALL log the error server-side and display a non-blocking warning message identifying the affected student by name.
5. WHEN the email dispatch is initiated, THE System SHALL mark `step_welcome_emails_completed` as `true` regardless of individual email delivery failures.
6. THE System SHALL allow the instructor to skip the WelcomeEmails step and advance to the EventsInfo step if no students were registered in Step 2.

---

### Requirement 6 — Step 4: Events Info

**User Story:** As an instructor, I want to see information about the events section during onboarding, so that I know where to find upcoming competitions and how to enroll students.

#### Acceptance Criteria

1. THE System SHALL present the EventsInfo step as an informational screen with no required form submissions.
2. THE System SHALL display a brief description of the events section, including the navigation path to reach it from the instructor dashboard.
3. WHEN the instructor clicks the completion control on the EventsInfo step, THE System SHALL mark `step_events_info_completed` as `true` and set `completed_at` to the current timestamp.
4. WHEN `completed_at` is set, THE System SHALL close the OnboardingModal and render the instructor dashboard without the OnboardingChecklist widget.

---

### Requirement 7 — Onboarding Checklist Widget

**User Story:** As an instructor, I want a persistent checklist on my dashboard while onboarding is incomplete, so that I can track and resume any pending steps without searching for them.

#### Acceptance Criteria

1. WHILE `completed_at` is `null`, THE System SHALL render the OnboardingChecklist widget on the instructor dashboard below the page header.
2. THE System SHALL display all four step names in the OnboardingChecklist with a visual indicator distinguishing completed steps from pending steps.
3. WHEN the instructor clicks a pending step in the OnboardingChecklist, THE System SHALL open the OnboardingModal directly at that step.
4. WHEN the instructor clicks a completed step in the OnboardingChecklist, THE System SHALL open the OnboardingModal at the first pending step.
5. THE System SHALL display the count of completed steps out of the total four steps in the OnboardingChecklist header.

---

### Requirement 8 — Authentication and Authorization

**User Story:** As a system operator, I want all onboarding operations to be protected by the instructor auth guard, so that only authenticated instructors can access or modify onboarding data.

#### Acceptance Criteria

1. THE System SHALL call `requireInstructor()` at the start of every Server Action and every Server Component that reads or writes onboarding data.
2. IF `requireInstructor()` redirects (the caller is unauthenticated or lacks an instructor role), THEN THE System SHALL not execute any onboarding read or write operation.
3. THE System SHALL use the `practitionerId` returned by `requireInstructor()` as the sole identifier for scoping all onboarding data reads and writes.
4. WHEN a Server Action receives input, THE System SHALL validate the input using Zod `safeParse()` before executing any database operation, and return `{ success: false, error: string, code: string }` on validation failure.
5. THE System SHALL never return raw database error messages or stack traces in Server Action responses; internal errors SHALL be logged server-side and a generic error message returned to the client.

---

### Requirement 9 — Module Structure

**User Story:** As a developer, I want the onboarding feature to live in a dedicated bounded context under `src/modules/instructor-onboarding/`, so that the codebase follows the established Clean Architecture + Screaming Architecture conventions.

#### Acceptance Criteria

1. THE System SHALL implement the instructor-onboarding feature exclusively within `src/modules/instructor-onboarding/` following the four-layer structure: `domain/`, `application/`, `infrastructure/`, `presentation/`.
2. THE System SHALL define the `OnboardingProgress` entity and the `OnboardingProgressRepository` interface within the `domain/` layer with zero imports from Next.js, Drizzle, or any framework.
3. THE System SHALL implement `DrizzleOnboardingProgressRepository` within `infrastructure/repositories/` marked with `import "server-only"`, as the sole file that accesses the `instructor_onboarding_progress` table via the Drizzle client or Supabase admin client.
4. THE System SHALL place all Server Actions in `presentation/actions/onboardingActions.ts` with `"use server"` at the top of the file.
5. THE System SHALL place the OnboardingModal, OnboardingChecklist, and AcademyForm components within `presentation/components/`.
6. THE System SHALL NOT import `DrizzleOnboardingProgressRepository` or `db` directly inside any React component file.
