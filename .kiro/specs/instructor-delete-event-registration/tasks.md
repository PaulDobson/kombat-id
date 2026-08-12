# Implementation Plan: Instructor Delete Event Registration

## Overview

This feature enables instructors to delete (unenroll) student registrations from martial arts events through the instructor portal. The implementation follows Clean Architecture with clear separation between domain logic, application use cases, infrastructure data access, and presentation layers.

The deletion capability enforces business rules to prevent deletion of confirmed paid registrations while allowing deletion of pending-payment and confirmed free-event registrations. All deletions are soft deletes that preserve audit trails.

## Tasks

- [x] 1. Implement domain layer foundations
  - [x] 1.1 Add CannotDeleteConfirmedPaidError to domain errors
    - Add new error class to `modules/event-registration/domain/errors.ts`
    - Error message: "No se puede eliminar una inscripción confirmada de un evento de pago"
    - _Requirements: 3.5_
  - [x] 1.2 Add isDeletable helper function to eventRegistration entity
    - Add pure helper function to `modules/event-registration/domain/entities/eventRegistration.ts`
    - Function signature: `isDeletable(status: RegistrationStatus, eventRegistrationFee: number | null): boolean`
    - Returns true for "pendiente_pago" regardless of fee
    - Returns true for "confirmada" when fee is null or 0
    - Returns false for "cancelada"
    - Returns false for "confirmada" when fee > 0
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.2, 7.3, 7.4, 7.5_
  - [ ]\* 1.3 Write unit tests for isDeletable helper
    - Create test file: `modules/event-registration/domain/entities/eventRegistration.test.ts` (if not exists, add tests)
    - Test case: isDeletable("pendiente_pago", 1000) returns true
    - Test case: isDeletable("confirmada", 0) returns true
    - Test case: isDeletable("confirmada", null) returns true
    - Test case: isDeletable("confirmada", 1000) returns false
    - Test case: isDeletable("cancelada", 0) returns false
    - Test case: isDeletable("cancelada", 1000) returns false
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement deleteStudentRegistration use case
  - [x] 2.1 Create deleteStudentRegistration use case
    - Create file: `modules/event-registration/application/use-cases/deleteStudentRegistration.ts`
    - Define DeleteStudentRegistrationInput interface with registrationId, instructorId, eventRegistrationFee
    - Implement use case function accepting input and repository dependency
    - Fetch registration by ID
    - Verify registration exists (throw RegistrationNotFoundError if not)
    - Verify instructor owns registration (throw RegistrationNotFoundError if not)
    - Verify registration not already cancelled (throw RegistrationNotFoundError if cancelled)
    - Apply business rule: throw CannotDeleteConfirmedPaidError if status="confirmada" AND fee > 0
    - Perform soft delete: update status to "cancelada", set cancelledAt, cancelledBy, updatedAt
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4_
  - [ ]\* 2.2 Write unit tests for deleteStudentRegistration use case
    - Create test file: `modules/event-registration/application/use-cases/deleteStudentRegistration.test.ts`
    - Test case: Successfully delete pending-payment registration
    - Test case: Successfully delete confirmed free-event registration (fee = 0)
    - Test case: Successfully delete confirmed free-event registration (fee = null)
    - Test case: Throw RegistrationNotFoundError when registration doesn't exist
    - Test case: Throw RegistrationNotFoundError when instructor doesn't own registration
    - Test case: Throw CannotDeleteConfirmedPaidError when deleting confirmed paid registration
    - Test case: Throw RegistrationNotFoundError when registration already cancelled
    - _Requirements: 2.4, 2.5, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Checkpoint - Verify domain and application layers
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement deleteRegistrationAction server action
  - [x] 4.1 Create deleteRegistrationAction server action
    - Create file: `modules/event-registration/presentation/actions/deleteRegistrationAction.ts`
    - Add "use server" directive at top of file
    - Define ActionResult type: `{ success: true; data: T } | { success: false; error: string; code: string }`
    - Define DeleteRegistrationSchema with Zod (registrationId: uuid, eventId: uuid)
    - Implement requireUser authentication check
    - Implement getInstructorPractitionerId helper function (query practitioners table for role check)
    - Implement getEventRegistrationFee helper function (query martial_events table)
    - Validate input with DeleteRegistrationSchema.safeParse
    - Return VALIDATION_ERROR if input invalid
    - Return FORBIDDEN if user not authenticated instructor
    - Call deleteStudentRegistration use case with DrizzleEventRegistrationRepository
    - Catch and map domain errors to ActionResult codes (NOT_FOUND, CANNOT_DELETE_CONFIRMED_PAID, INTERNAL_ERROR)
    - Call revalidatePath for `/instructor/events/${eventId}/enroll` on success
    - Return success result
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.5_
  - [ ]\* 4.2 Write integration tests for deleteRegistrationAction
    - Create test file: `modules/event-registration/presentation/actions/deleteRegistrationAction.test.ts`
    - Test case: Authenticated instructor can delete own pending registration
    - Test case: Authenticated instructor can delete own free-event confirmed registration
    - Test case: Unauthenticated user is redirected (requireUser)
    - Test case: Non-instructor user receives FORBIDDEN error
    - Test case: Instructor cannot delete another instructor's registration
    - Test case: Instructor cannot delete confirmed paid registration
    - Test case: Invalid input returns VALIDATION_ERROR
    - Test case: Successful deletion triggers revalidatePath
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement DeleteRegistrationButton client component
  - [x] 5.1 Create DeleteRegistrationButton component
    - Create file: `modules/event-registration/presentation/components/DeleteRegistrationButton.tsx`
    - Add "use client" directive
    - Define Props interface: registrationId, eventId, studentName, onSuccess callback
    - Use useState for showConfirm dialog state
    - Use useTransition for isPending state
    - Implement handleDelete function that calls deleteRegistrationAction
    - Handle success: close dialog, call onSuccess callback
    - Handle error: log error to console
    - Render delete button with trash icon, error-colored styling, disabled during pending
    - Render confirmation dialog modal with student name, event context
    - Dialog has "Cancelar" and "Eliminar" buttons
    - Show loading state ("Eliminando...") during pending
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.6, 7.7_

- [x] 6. Update EnrollTabs to pass registration fee
  - [x] 6.1 Update EnrollTabs component to accept and pass eventRegistrationFee
    - Modify file: `app/(dashboard)/instructor/events/[eventId]/enroll/EnrollTabs.tsx`
    - Add eventRegistrationFee prop (type: number | null)
    - Pass eventRegistrationFee to RegisteredTab component
    - Pass eventId to RegisteredTab component
    - _Requirements: 7.1, 7.2_

- [x] 7. Update RegisteredTab to render delete buttons
  - [x] 7.1 Update RegisteredTab to conditionally render delete buttons
    - Modify RegisteredTab component within EnrollTabs.tsx or extract to separate file
    - Import DeleteRegistrationButton component
    - Import isDeletable helper from domain layer
    - Add eventId and eventRegistrationFee to props
    - Add "Acciones" column header to table
    - For each registration, call isDeletable(reg.status, eventRegistrationFee)
    - If canDelete is true, render DeleteRegistrationButton in actions column
    - Pass registrationId, eventId, studentName props to button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 8. Update EnrollPage to pass registration fee
  - [x] 8.1 Update page.tsx to pass event registration_fee to EnrollTabs
    - Modify file: `app/(dashboard)/instructor/events/[eventId]/enroll/page.tsx`
    - Pass event.registration_fee as eventRegistrationFee prop to EnrollTabs component
    - _Requirements: 7.1_

- [x] 9. Final checkpoint - Ensure all tests pass and UI works correctly
  - Ensure all tests pass, ask the user if questions arise.
  - Verify delete buttons appear only for eligible registrations
  - Verify confirmation dialog shows correct information
  - Verify successful deletion updates the UI
  - Verify error handling displays appropriate messages

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- All implementation uses TypeScript following Next.js App Router patterns
- The design uses Clean Architecture with screaming architecture folder structure
- Server Actions are the composition root that instantiate repositories
- Soft delete pattern preserves audit trail (cancelledAt, cancelledBy)
- Authorization is enforced at multiple layers (UI, server action, use case)
- Input validation uses Zod schemas at the server action boundary
- Revalidation ensures UI stays current without full page reload

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1"] },
    { "id": 4, "tasks": ["6.1", "7.1"] },
    { "id": 5, "tasks": ["8.1"] }
  ]
}
```
