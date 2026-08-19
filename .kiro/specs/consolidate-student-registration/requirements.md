# Requirements Document

## Introduction

This specification consolidates the student registration implementations by making the `RegisterStudentsStep` component (used in the onboarding flow) reuse the existing `RegisterStudentForm` component instead of maintaining a duplicate custom implementation. The consolidation eliminates code duplication while preserving the onboarding-specific workflow features: multiple sequential registrations, skip option, session state management, and navigation controls.

## Glossary

- **RegisterStudentForm**: The comprehensive Client Component form located at `src/app/(dashboard)/instructor/RegisterStudentForm.tsx` that handles complete student registration with all fields (RUT, name, email, birthdate, gender, grade, start date, weight, height, martial art history)
- **RegisterStudentsStep**: The onboarding-specific component located at `src/modules/instructor-onboarding/presentation/components/steps/RegisterStudentsStep.tsx` that allows instructors to register multiple students during their initial onboarding process
- **Onboarding_Flow**: The multi-step instructor onboarding process that guides new instructors through academy creation, student registration, welcome emails, and events information
- **Session_Student_State**: The in-memory collection of students registered during the current onboarding session before proceeding to the next step
- **Instructor_Actions**: The Server Action `registerStudentAction` from `@/modules/practitioner-identity/presentation/actions/instructorActions` that creates comprehensive practitioner records
- **Onboarding_Actions**: The Server Action `registerStudentAction` from `@/modules/instructor-onboarding/presentation/actions/onboardingActions` that creates simplified practitioner records for onboarding

## Requirements

### Requirement 1: Form Component Reuse

**User Story:** As a developer, I want RegisterStudentsStep to reuse RegisterStudentForm, so that I eliminate code duplication and maintain a single source of truth for student registration UI.

#### Acceptance Criteria

1. WHEN RegisterStudentsStep renders, THE Component SHALL render RegisterStudentForm as its primary form interface
2. THE RegisterStudentsStep SHALL NOT contain any duplicate form field markup (input elements, labels, validation messages)
3. THE RegisterStudentForm SHALL remain a self-contained Client Component with no onboarding-specific dependencies
4. THE RegisterStudentForm SHALL accept an `onSuccess` callback prop that RegisterStudentsStep provides to handle post-registration logic

### Requirement 2: Onboarding Workflow Preservation

**User Story:** As an instructor completing onboarding, I want to register multiple students sequentially in the same session, so that I can efficiently add my initial roster before continuing.

#### Acceptance Criteria

1. WHEN a student is successfully registered via RegisterStudentForm, THE RegisterStudentsStep SHALL add the student to Session_Student_State
2. WHEN a student is added to Session_Student_State, THE RegisterStudentsStep SHALL display the student in a "Registered students" list
3. WHEN RegisterStudentForm completes a registration, THE RegisterStudentsStep SHALL reset the form to allow immediate registration of another student
4. THE RegisterStudentsStep SHALL display a count of registered students in the "Continue" button label
5. THE Session_Student_State SHALL persist only within the RegisterStudentsStep component instance and SHALL NOT be persisted to the database until the user proceeds to the next step

### Requirement 3: Action Consolidation

**User Story:** As a developer, I want a single registerStudentAction that handles both onboarding and standard registration, so that I maintain consistent business logic and database state.

#### Acceptance Criteria

1. THE RegisterStudentForm SHALL call Instructor_Actions.registerStudentAction instead of Onboarding_Actions.registerStudentAction
2. WHEN RegisterStudentForm is used within RegisterStudentsStep, THE Form SHALL pass the `academyId` prop received from the parent step
3. THE Instructor_Actions.registerStudentAction SHALL create practitioner records with `is_active: false` status (matching current behavior)
4. THE Instructor_Actions.registerStudentAction SHALL create academy membership records when `academyId` is provided
5. THE Instructor_Actions.registerStudentAction SHALL send welcome emails with temporary passwords when email is provided
6. THE Onboarding_Actions.registerStudentAction SHALL be marked as deprecated and removed after migration

### Requirement 4: Return Value Compatibility

**User Story:** As a developer, I want RegisterStudentsStep to receive student information after registration, so that I can display registered students and pass them to the welcome email step.

#### Acceptance Criteria

1. WHEN Instructor_Actions.registerStudentAction succeeds, THE Action SHALL return `{ success: true, data: { publicId: string } }`
2. WHEN RegisterStudentsStep receives a successful registration result, THE Component SHALL store the student's publicId, fullName, email, and temporaryPassword (if auth account was created)
3. THE RegisterStudentsStep SHALL query the created practitioner record if necessary to retrieve the full student details for Session_Student_State
4. THE RegisterStudentsStep SHALL pass Session_Student_State to the welcome email step when the user clicks "Continue"

### Requirement 5: Field Mapping and Defaults

**User Story:** As an instructor in onboarding, I want the simplified registration form to collect only essential fields, so that I can quickly register students without overwhelming data entry.

#### Acceptance Criteria

1. WHEN RegisterStudentForm is rendered within RegisterStudentsStep, THE Form SHALL display only the required fields: RUT, fullName, email, birthDate
2. THE RegisterStudentForm SHALL accept a `simplifiedMode` boolean prop that hides optional fields (gender, weight, height, martial art history) when true
3. WHEN simplifiedMode is true and the form is submitted, THE RegisterStudentForm SHALL provide default values: gender="other", grade="white", startDate=today
4. THE RegisterStudentForm SHALL NOT modify its internal validation or submission logic based on simplifiedMode
5. WHERE simplifiedMode is false, THE RegisterStudentForm SHALL display the complete field set (matching current behavior)

### Requirement 6: Navigation Controls Preservation

**User Story:** As an instructor completing onboarding, I want to skip student registration or continue after registering students, so that I can control my onboarding pace.

#### Acceptance Criteria

1. THE RegisterStudentsStep SHALL display a "Skip" button that calls `onComplete([])` with an empty array
2. THE RegisterStudentsStep SHALL display a "Continue" button that is disabled when Session_Student_State is empty
3. WHEN the user clicks "Continue", THE RegisterStudentsStep SHALL call `onComplete(Session_Student_State)`
4. THE RegisterStudentsStep SHALL NOT persist Session_Student_State to the database when "Skip" is clicked
5. THE RegisterStudentsStep SHALL display the count of registered students in the "Continue" button text as "Continue (N)"

### Requirement 7: Error Handling Consistency

**User Story:** As an instructor registering students, I want to see clear error messages when registration fails, so that I can correct issues and retry.

#### Acceptance Criteria

1. WHEN Instructor_Actions.registerStudentAction returns `{ success: false }`, THE RegisterStudentForm SHALL display the error message from the action result
2. THE RegisterStudentForm SHALL display validation errors inline for each field that fails Zod schema validation
3. IF a registration fails, THE RegisterStudentsStep SHALL NOT add the student to Session_Student_State
4. THE RegisterStudentsStep SHALL allow the user to retry registration after an error without losing previously registered students in Session_Student_State
5. THE RegisterStudentForm SHALL clear previous error messages when the user modifies form fields

### Requirement 8: Component Separation of Concerns

**User Story:** As a developer, I want clear boundaries between form logic and workflow logic, so that I can maintain and test each component independently.

#### Acceptance Criteria

1. THE RegisterStudentForm SHALL be responsible only for form UI, validation, and calling the Server Action
2. THE RegisterStudentsStep SHALL be responsible only for session state management, navigation, and workflow orchestration
3. THE RegisterStudentForm SHALL NOT import or depend on any types from `@/modules/instructor-onboarding`
4. THE RegisterStudentsStep SHALL NOT duplicate any form field rendering or validation logic
5. THE RegisterStudentForm SHALL emit success events via the `onSuccess` callback prop without knowledge of the parent workflow context

### Requirement 9: Styling and UX Consistency

**User Story:** As an instructor, I want the registration form in onboarding to match the visual design of the onboarding flow, so that the experience feels cohesive.

#### Acceptance Criteria

1. WHEN RegisterStudentForm is rendered within RegisterStudentsStep, THE Form SHALL apply the onboarding-specific styling classes from the parent container
2. THE RegisterStudentForm SHALL NOT force its own container styling when used as a child component
3. THE RegisterStudentsStep SHALL wrap RegisterStudentForm in a styled container matching the onboarding design (bg-neutral-800/50, border-neutral-700, rounded-xl, p-4)
4. THE RegisterStudentsStep SHALL display the "Registered students" list above the form with consistent spacing and styling
5. WHERE RegisterStudentForm is used outside onboarding (RegisterStudentModal, RegisterStudentSection), THE Form SHALL maintain its current container styling

### Requirement 10: Testing and Migration Safety

**User Story:** As a developer, I want to verify that the consolidated implementation matches the original behavior, so that I can deploy confidently without regressions.

#### Acceptance Criteria

1. THE Migration SHALL preserve the exact database state created by Onboarding_Actions.registerStudentAction (same fields, same values, same relationships)
2. THE Migration SHALL preserve the exact Session_Student_State shape expected by the welcome email step
3. WHEN the migration is complete, THE Developer SHALL verify that students registered via RegisterStudentsStep appear in the instructor's academy with is_active=false status
4. WHEN the migration is complete, THE Developer SHALL verify that welcome emails are sent with temporary passwords
5. THE Migration SHALL include a rollback plan that restores Onboarding_Actions.registerStudentAction if critical issues are discovered
