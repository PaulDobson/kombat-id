# Implementation Plan: Allow Re-subscription After Cancellation

## Overview

This bugfix enables students who were previously deleted (cancelled) from an event to re-enroll. Currently, the system prevents re-enrollment because it finds any existing registration without checking if it's cancelled. The fix adds a new repository method that only searches for active (non-cancelled) registrations, allowing students with cancelled registrations to enroll again.

The implementation modifies the domain interface, infrastructure repository, and application use case without requiring changes to presentation layers.

## Tasks

- [x] 1. Add findActiveByPractitionerAndEvent method to repository interface
  - [x] 1.1 Add method signature to IEventRegistrationRepository interface
    - Modify file: `src/modules/event-registration/domain/interfaces/eventRegistrationRepository.ts`
    - Add method signature: `findActiveByPractitionerAndEvent(practitionerId: string, eventId: string): Promise<EventRegistration | null>`
    - Add JSDoc explaining method returns only non-cancelled registrations (status != "cancelada")
    - Document that null is returned if no registration exists or if existing registration is cancelled
    - _Bugfix section: Expected Behavior 2.2_

- [ ] 2. Implement findActiveByPractitionerAndEvent in Drizzle repository
  - [ ] 2.1 Implement method in DrizzleEventRegistrationRepository
    - Modify file: `src/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository.ts`
    - Implement `findActiveByPractitionerAndEvent` method
    - Use `and()` to combine three conditions: `eq(practitionerId)`, `eq(eventId)`, `ne(status, "cancelada")`
    - Use `db.query.eventRegistrationsTable.findFirst()` with where clause
    - Map result using existing `toEntity` method
    - Return null if no row found
    - _Bugfix section: Expected Behavior 2.2, 2.3_

- [ ] 3. Update enrollStudents use case to use new method
  - [ ] 3.1 Replace findByPractitionerAndEvent with findActiveByPractitionerAndEvent
    - Modify file: `src/modules/event-registration/application/use-cases/enrollStudents.ts`
    - Replace line 36: `repository.findByPractitionerAndEvent()` with `repository.findActiveByPractitionerAndEvent()`
    - Rename variable from `existing` to `existingActive` for semantic clarity
    - Keep conditional logic unchanged (skip if existingActive is not null)
    - _Bugfix section: Expected Behavior 2.1, 2.4_

- [ ]\* 4. Write unit tests for enrollStudents with cancelled registrations
  - [ ]\* 4.1 Test re-enrollment with cancelled registration
    - Create or modify test file: `src/modules/event-registration/application/use-cases/__tests__/enrollStudents.test.ts`
    - Test case: Student with cancelled registration can re-enroll (mock repo returns null for findActiveByPractitionerAndEvent)
    - Test case: Student with active "confirmada" registration cannot re-enroll (regression test)
    - Test case: Student with active "pendiente_pago" registration cannot re-enroll (regression test)
    - Test case: Student with no prior registration can enroll (regression test)
    - Verify `save` is called with new registration for re-enrollment case
    - Verify student appears in `enrolled` array, not in `skipped` array
    - _Bugfix section: Unchanged Behavior 3.1_

- [ ]\* 5. Write integration tests for repository implementation
  - [ ]\* 5.1 Test findActiveByPractitionerAndEvent method
    - Create or modify test file: `src/modules/event-registration/infrastructure/repositories/__tests__/drizzleEventRegistrationRepository.test.ts`
    - Test case: Returns null when only cancelled registration exists
    - Test case: Returns registration entity when confirmed registration exists
    - Test case: Returns registration entity when pendiente_pago registration exists
    - Test case: Returns null when no registration exists at all
    - Use actual database for integration validation
    - Clean up test data after each test
    - _Bugfix section: Expected Behavior 2.2_

- [ ]\* 6. Run end-to-end manual test for re-enrollment flow
  - [ ]\* 6.1 Manual test of complete re-enrollment workflow
    - Start local development environment
    - Login as instructor
    - Navigate to event enrollment page
    - Enroll a student in an event
    - Delete the student from the event (marking registration as cancelled)
    - Attempt to re-enroll the same student
    - Verify student appears in "Inscritos exitosamente" section (not "Omitidos")
    - Verify new registration is created in database with new UUID
    - Verify old cancelled registration remains intact in database
    - _Bugfix section: Expected Behavior 2.4_

- [ ]\* 7. Verify no duplicate active registrations exist
  - [ ]\* 7.1 Run validation query to check for duplicates
    - Execute SQL query: `SELECT practitioner_id, event_id, COUNT(*) FROM event_registrations WHERE status IN ('confirmada', 'pendiente_pago') GROUP BY practitioner_id, event_id HAVING COUNT(*) > 1`
    - Verify query returns zero results
    - Document validation approach in code comments
    - _Bugfix section: Unchanged Behavior 3.1_

- [ ]\* 8. Update code documentation
  - [ ]\* 8.1 Add JSDoc to new method and use case
    - Add comprehensive JSDoc to `findActiveByPractitionerAndEvent` in interface explaining filtering behavior
    - Add comment in `enrollStudents.ts` explaining why active-only method is used
    - Document business rule: cancelled registrations don't block re-enrollment
    - _Design document section: Documentation Updates_

## Notes

- Tasks marked with `*` are optional testing and documentation tasks
- Core implementation is in tasks 1-3 (interface, repository, use case)
- No changes required to presentation layer (UI or server actions)
- Fix preserves historical cancelled registrations (soft delete pattern)
- Authorization and input validation remain unchanged
- No database schema migrations required

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["6.1", "7.1"] },
    { "id": 5, "tasks": ["8.1"] }
  ]
}
```
