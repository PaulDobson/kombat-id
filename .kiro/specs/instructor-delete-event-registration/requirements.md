# Requirements Document

## Introduction

This feature enables instructors to delete (unenroll) student registrations from martial arts events through the instructor portal. The deletion capability is restricted by business rules to prevent revenue loss and maintain data integrity for confirmed/paid registrations.

## Glossary

- **Instructor**: A practitioner with role "instructor", "profesor", or "maestro" who can enroll students in events
- **Registration**: An event_registration record linking a practitioner to a martial_event
- **Event**: A martial arts event (competition, seminar, or exam) with optional registration fees
- **Free_Event**: An event where registration_fee is null or 0
- **Paid_Event**: An event where registration_fee is greater than 0
- **System**: The Kombat ID event registration system
- **Enrollment_Table**: The EnrollTabs component displaying registered students in the instructor portal
- **Delete_Action**: The server action that processes registration deletion requests

## Requirements

### Requirement 1: Deletion Eligibility Rules

**User Story:** As an instructor, I want to know which registrations I can delete, so that I can manage my students' event enrollments appropriately.

#### Acceptance Criteria

1. WHEN viewing the enrollment table AND a registration status is "pendiente_pago", THE System SHALL display a delete button for that registration
2. WHEN viewing the enrollment table AND an event is a Free_Event AND a registration status is "confirmada", THE System SHALL display a delete button for that registration
3. WHEN viewing the enrollment table AND an event is a Paid_Event AND a registration status is "confirmada", THE System SHALL NOT display a delete button for that registration
4. WHEN viewing the enrollment table AND a registration status is "cancelada", THE System SHALL NOT display a delete button for that registration

### Requirement 2: Authorization Verification

**User Story:** As a system administrator, I want to ensure only authorized instructors can delete registrations, so that student enrollments are protected from unauthorized modifications.

#### Acceptance Criteria

1. WHEN a delete request is received, THE Delete_Action SHALL verify the requesting user has an active authenticated session
2. WHEN a delete request is received, THE Delete_Action SHALL verify the authenticated user is a practitioner with an instructor role
3. WHEN a delete request is received AND the authenticated user is not an instructor, THE Delete_Action SHALL reject the request with error code "FORBIDDEN"
4. WHEN a delete request is received, THE Delete_Action SHALL verify the registration's instructorId matches the authenticated instructor's practitioner ID
5. WHEN a delete request is received AND the instructor does not own the registration, THE Delete_Action SHALL reject the request with error code "FORBIDDEN"

### Requirement 3: Deletion Validation

**User Story:** As an instructor, I want the system to prevent invalid deletions, so that I cannot accidentally delete confirmed paid registrations or non-existent records.

#### Acceptance Criteria

1. WHEN a delete request contains a registration ID, THE Delete_Action SHALL validate the input using Zod schema validation
2. WHEN input validation fails, THE Delete_Action SHALL return error code "VALIDATION_ERROR" with a descriptive message
3. WHEN a delete request is processed, THE Delete_Action SHALL verify the registration exists in the database
4. WHEN the registration does not exist, THE Delete_Action SHALL return error code "NOT_FOUND"
5. WHEN the registration exists AND the event is a Paid_Event AND the status is "confirmada", THE Delete_Action SHALL reject the deletion with error code "CANNOT_DELETE_CONFIRMED_PAID"
6. WHEN the registration exists AND the event is a Free_Event AND the status is "confirmada", THE Delete_Action SHALL allow the deletion to proceed
7. WHEN the registration exists AND the status is "pendiente_pago", THE Delete_Action SHALL allow the deletion to proceed regardless of event fee

### Requirement 4: Deletion Execution

**User Story:** As an instructor, I want deleted registrations to be properly removed or marked, so that event capacity is accurately reflected and my enrollment list stays current.

#### Acceptance Criteria

1. WHEN a valid deletion is executed, THE System SHALL perform a soft delete by updating the registration status to "cancelada"
2. WHEN a valid deletion is executed, THE System SHALL set the cancelledAt timestamp to the current date and time
3. WHEN a valid deletion is executed, THE System SHALL set the cancelledBy field to the authenticated instructor's practitioner ID
4. WHEN a valid deletion is executed, THE System SHALL persist the updated registration to the database
5. WHEN the deletion succeeds, THE Delete_Action SHALL revalidate the enrollment page path to refresh displayed data
6. WHEN the deletion succeeds, THE Delete_Action SHALL return success status with no error

### Requirement 5: User Interface Feedback

**User Story:** As an instructor, I want clear confirmation before deleting a registration and immediate feedback after deletion, so that I can act confidently and see results immediately.

#### Acceptance Criteria

1. WHEN I click a delete button, THE System SHALL display a confirmation dialog before proceeding
2. THE confirmation dialog SHALL display the student's name and event name
3. THE confirmation dialog SHALL explain that the action will unenroll the student
4. WHEN I confirm deletion in the dialog, THE System SHALL display a loading state on the delete button
5. WHEN deletion succeeds, THE System SHALL display a success toast notification
6. WHEN deletion fails, THE System SHALL display an error toast notification with the error message
7. WHEN the page revalidates after deletion, THE deleted registration SHALL either disappear from the active list OR appear with "cancelada" status

### Requirement 6: Event Capacity Impact

**User Story:** As an instructor, I want deleted registrations to free up event capacity, so that I can enroll other students when space becomes available.

#### Acceptance Criteria

1. WHEN a registration with status "confirmada" is deleted from a capacity-limited event, THE System SHALL decrease the confirmed count by one
2. WHEN the confirmed count decreases below max_participants, THE enrollment interface SHALL display as having available capacity
3. WHEN a registration with status "pendiente_pago" is deleted, THE System SHALL NOT affect the confirmed count
4. FOR ALL registrations with status "cancelada", THE System SHALL exclude them from confirmed count calculations

### Requirement 7: Client-Side Button Visibility

**User Story:** As an instructor, I want to see delete buttons only on eligible registrations, so that I understand which enrollments I can remove.

#### Acceptance Criteria

1. WHEN rendering the enrollment table, THE Enrollment_Table SHALL check each registration's deletability
2. FOR ALL registrations where status is "pendiente_pago", THE Enrollment_Table SHALL render a delete button
3. FOR ALL registrations where status is "confirmada" AND event registration_fee is null or 0, THE Enrollment_Table SHALL render a delete button
4. FOR ALL registrations where status is "confirmada" AND event registration_fee is greater than 0, THE Enrollment_Table SHALL NOT render a delete button
5. FOR ALL registrations where status is "cancelada", THE Enrollment_Table SHALL NOT render a delete button
6. THE delete button SHALL use a destructive visual style (red/error color scheme)
7. THE delete button SHALL include a trash icon for visual clarity
