# Implementation Plan: Consolidate Student Registration Forms

## Overview

This implementation consolidates student registration by making `RegisterStudentsStep` reuse the existing `RegisterStudentForm` component, eliminating code duplication while preserving onboarding workflow features. The migration follows a 6-phase approach designed for incremental deployment with clear rollback points at each stage.

## Tasks

### Phase 1: Enhance registerStudentAction

- [x] 1. Expand registerStudentAction return type to include all required fields
  - Modify `ActionResult` return type in `src/modules/practitioner-identity/presentation/actions/instructorActions.ts`
  - Change from `ActionResult<{ publicId: string }>` to `ActionResult<{ publicId: string; fullName: string; email: string; temporaryPassword?: string }>`
  - Update the success return statement to include `fullName`, `email`, and `temporaryPassword` fields
  - Ensure `temporaryPassword` is only included when auth account was created
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [ ]\* 1.1 Write unit tests for enhanced action return type
  - Test that action returns all expected fields in success response
  - Test that `temporaryPassword` is present when email provided and auth created
  - Test that `temporaryPassword` is undefined when no email provided
  - Test that existing consumers (RegisterStudentForm, RegisterStudentModal) work with enhanced return type
  - _Requirements: 4.1, 4.2_

### Phase 2: Add simplifiedMode to RegisterStudentForm

- [x] 2. Add simplifiedMode prop and conditional field rendering
  - [x] 2.1 Add new props to RegisterStudentForm interface
    - Add `simplifiedMode?: boolean` prop (default: false)
    - Add `onSuccess?: (result: { publicId: string; fullName: string; email: string; temporaryPassword?: string }) => void` callback prop
    - Update component TypeScript interface in `src/app/(dashboard)/instructor/RegisterStudentForm.tsx`
    - _Requirements: 1.4, 5.2, 5.3_

  - [x] 2.2 Implement conditional field rendering based on simplifiedMode
    - Wrap optional fields (gender, weight, height, martial art fields) in conditional rendering
    - Show fields only when `simplifiedMode !== true`
    - Keep required fields (RUT, fullName, studentEmail, birthDate) always visible
    - Ensure grade field remains read-only displaying "Blanco"
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 2.3 Apply default values when simplifiedMode is true
    - Set `gender="other"` when simplifiedMode=true and form submitted
    - Set `grade="white"` when simplifiedMode=true and form submitted
    - Set `startDate=today` when simplifiedMode=true and form submitted
    - Do not modify form validation or submission logic
    - _Requirements: 5.3, 5.4_

  - [x] 2.4 Implement onSuccess callback invocation
    - Call `onSuccess` callback after successful registration
    - Pass complete result object including `publicId`, `fullName`, `email`, `temporaryPassword`
    - Reset form to initial state after success callback
    - Ensure form reset maintains correct startDate (today)
    - _Requirements: 1.4, 4.2, 8.5_

- [ ]\* 2.5 Write unit tests for RegisterStudentForm simplifiedMode
  - Test that optional fields are hidden when simplifiedMode=true
  - Test that optional fields are visible when simplifiedMode=false
  - Test that default values applied correctly in simplified mode
  - Test that onSuccess callback invoked with correct data
  - Test that form resets after successful submission
  - _Requirements: 5.2, 5.3, 5.4, 8.5_

### Phase 3: Refactor RegisterStudentsStep

- [x] 3. Replace duplicate form with RegisterStudentForm component
  - [x] 3.1 Remove duplicate form markup from RegisterStudentsStep
    - Delete all form field rendering code (input elements, labels, validation messages)
    - Delete form state management (useForm hook, register functions)
    - Delete inline form submission handler
    - Keep session state management (`registeredStudents`, `setRegisteredStudents`)
    - Keep navigation buttons ("Skip", "Continue")
    - Keep "Registered students" list rendering
    - File: `src/modules/instructor-onboarding/presentation/components/steps/RegisterStudentsStep.tsx`
    - _Requirements: 1.1, 1.2, 8.2, 8.4_

  - [x] 3.2 Import and render RegisterStudentForm component
    - Import RegisterStudentForm from `@/app/(dashboard)/instructor/RegisterStudentForm`
    - Render RegisterStudentForm with `simplifiedMode={true}` prop
    - Pass `academyId` prop from RegisterStudentsStep props
    - Wrap form in styled container: `bg-neutral-800/50 border border-neutral-700 rounded-xl p-4`
    - _Requirements: 1.1, 2.1, 5.1, 9.3_

  - [x] 3.3 Implement handleFormSuccess callback
    - Create `handleFormSuccess` function that receives action result
    - Extract student data from result: `publicId`, `fullName`, `email`, `temporaryPassword`
    - Map to SessionStudent interface: `{ practitionerId, fullName, email, temporaryPassword }`
    - Add student to `registeredStudents` state array
    - Ensure existing students preserved in list
    - _Requirements: 2.2, 2.3, 4.2, 4.3_

  - [x] 3.4 Update navigation button logic
    - "Skip" button calls `onComplete([])` with empty array
    - "Continue" button disabled when `registeredStudents.length === 0`
    - "Continue" button shows count: `Continuar (${registeredStudents.length})`
    - "Continue" button calls `onComplete(registeredStudents)` with session state
    - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.5_

- [ ]\* 3.5 Write unit tests for refactored RegisterStudentsStep
  - Test that RegisterStudentForm rendered with correct props
  - Test that simplifiedMode=true passed to form
  - Test that academyId passed correctly
  - Test that student added to session state on success
  - Test that "Skip" button works with zero students
  - Test that "Continue" button disabled when list empty
  - Test that "Continue" button shows correct count
  - Test that session state preserved after registration error
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.3_

### Phase 4: Update Form to Use Consolidated Action

- [x] 4. Switch RegisterStudentForm to use instructorActions.registerStudentAction
  - Update import statement from `@/modules/instructor-onboarding/presentation/actions/onboardingActions` to `@/modules/practitioner-identity/presentation/actions/instructorActions`
  - Verify form submission logic works with enhanced action
  - Test that all existing consumers work correctly (RegisterStudentModal, RegisterStudentSection)
  - File: `src/app/(dashboard)/instructor/RegisterStudentForm.tsx`
  - _Requirements: 3.1, 3.2, 8.3_

- [ ]\* 4.1 Write integration tests for action consolidation
  - Test that action creates student with `is_active=false` status
  - Test that academy membership created when `academyId` provided
  - Test that welcome email sent when email provided and auth created
  - Test that temporary password returned in action result
  - Test that admin notification sent for new student
  - _Requirements: 3.3, 3.4, 3.5, 4.1_

### Phase 5: Deprecate Old Onboarding Action

- [x] 5. Mark onboardingActions.registerStudentAction as deprecated
  - Add JSDoc deprecation comment: `@deprecated Use instructorActions.registerStudentAction instead. This action will be removed in the next release.`
  - Add console warning in function body pointing to new action
  - Verify no remaining calls to deprecated action in codebase
  - File: `src/modules/instructor-onboarding/presentation/actions/onboardingActions.ts`
  - _Requirements: 3.6, 10.5_

### Phase 6: Integration Testing and Verification

- [ ] 6. Checkpoint - Run complete integration test suite
  - Ensure all tests pass, ask the user if questions arise.

- [ ]\* 6.1 Test complete onboarding flow with student registration
  - Navigate through instructor onboarding
  - Create or select academy
  - Register multiple students (at least 2) sequentially
  - Verify students appear in "Registered students" list
  - Click "Continue" and verify students passed to welcome email step
  - Verify database state: students created with `is_active=false`, role="alumno"
  - Verify academy memberships created correctly
  - _Requirements: 2.1, 2.2, 2.3, 10.1, 10.2_

- [ ]\* 6.2 Test skip functionality in onboarding
  - Start onboarding flow
  - Click "Skip" button with zero students registered
  - Verify proceed to welcome email step with empty student list
  - Verify no database records created
  - _Requirements: 6.1, 6.4_

- [ ]\* 6.3 Test error handling and retry flow
  - Attempt to register student with duplicate RUT
  - Verify error displayed inline
  - Verify previously registered students still in list
  - Correct RUT and retry registration
  - Verify successful registration after correction
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]\* 6.4 Test welcome email delivery
  - Register student with valid email address
  - Verify welcome email sent with temporary password
  - Verify temporary password returned in action result
  - Verify password matches what was emailed
  - _Requirements: 3.5, 10.4_

- [ ]\* 6.5 Test non-onboarding registration contexts
  - Test RegisterStudentModal still works correctly
  - Test RegisterStudentSection still works correctly
  - Verify full field set visible (simplifiedMode=false by default)
  - Verify submissions create students successfully
  - _Requirements: 1.3, 5.5, 9.5_

### Phase 7: Cleanup and Removal

- [~] 7. Final checkpoint - Verify all tests passing before removal
  - Ensure all tests pass, ask the user if questions arise.

- [~] 8. Remove deprecated onboarding action
  - Delete `registerStudentAction` function from `src/modules/instructor-onboarding/presentation/actions/onboardingActions.ts`
  - Remove any remaining imports of deprecated action
  - Update test mocks to use new action
  - Run full test suite to verify no breakage
  - _Requirements: 10.5_

- [~] 9. Final verification and documentation
  - Run `pnpm build` and verify successful build
  - Run complete test suite and verify all passing
  - Update any relevant documentation
  - Verify no console warnings or errors
  - _Requirements: 10.1, 10.3, 10.5_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation before proceeding
- The migration follows Clean Architecture principles with clear layer boundaries
- Server Actions are the composition root and handle dependency injection
- Client Components remain presentation-only with no business logic
- All external inputs validated with Zod before processing
- Authentication and authorization checks mandatory in all Server Actions
- Rollback plan available at each phase boundary

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["1.1", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 5, "tasks": ["3.5", "4"] },
    { "id": 6, "tasks": ["4.1", "5"] },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["8"] },
    { "id": 9, "tasks": ["9"] }
  ]
}
```
