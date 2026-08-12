# Design Document: Instructor Delete Event Registration

## Overview

This feature enables instructors to delete (unenroll) student registrations from martial arts events through the instructor portal at `/instructor/events/[eventId]/enroll`. The deletion capability implements business rules that prevent deletion of confirmed paid registrations to avoid revenue loss, while allowing deletion of pending-payment registrations and confirmed free-event registrations.

The design follows Clean Architecture principles with clear separation between domain logic, application use cases, infrastructure data access, and presentation layers. It extends the existing `event-registration` module structure without introducing new architectural patterns.

### Key Design Decisions

1. **Soft Delete Pattern**: Registrations are never physically deleted. The system updates status to "cancelada" and records audit metadata (cancelledAt, cancelledBy)
2. **Authorization at Multiple Layers**: UI hides ineligible buttons (UX), server action verifies ownership (security), use case validates business rules (correctness)
3. **Event Fee Awareness**: Delete button visibility requires event registration_fee data to be passed from page.tsx → EnrollTabs → RegisteredTab component
4. **Composition Root in Server Action**: The server action instantiates the repository and calls the use case, following DIP
5. **Revalidation Strategy**: After successful deletion, revalidatePath is called to refresh the enrollment table without full page reload

## Architecture

The implementation spans four architectural layers within the `event-registration` module:

```
modules/event-registration/
├── domain/
│   ├── errors.ts                           # Add CannotDeleteConfirmedPaidError
│   └── entities/eventRegistration.ts       # Add isDeletable() helper
├── application/
│   └── use-cases/
│       └── deleteStudentRegistration.ts    # NEW: Business logic for deletion
├── infrastructure/
│   └── repositories/
│       └── drizzleEventRegistrationRepository.ts  # update() method exists
└── presentation/
    ├── actions/
    │   └── deleteRegistrationAction.ts     # NEW: Server Action
    └── components/
        └── DeleteRegistrationButton.tsx    # NEW: Client Component

app/(dashboard)/instructor/events/[eventId]/enroll/
├── page.tsx                                 # Pass registration_fee to EnrollTabs
├── EnrollTabs.tsx                           # Pass fee + deletability to RegisteredTab
└── components/
    └── RegisteredTab.tsx                    # Render DeleteRegistrationButton
```

```

### Data Flow

```

User clicks delete button
↓
[DeleteRegistrationButton] Shows confirmation dialog
↓
User confirms
↓
[DeleteRegistrationButton] Calls deleteRegistrationAction (Server Action)
↓
[deleteRegistrationAction]

1. Verify session → requireUser()
2. Verify instructor role
3. Validate input with Zod
4. Instantiate DrizzleEventRegistrationRepository
5. Call deleteStudentRegistration use case
   ↓
   [deleteStudentRegistration]
6. Fetch registration by ID
7. Verify registration exists
8. Verify instructor owns registration (authorization)
9. Fetch event to check registration_fee
10. Apply deletion business rules:
    - DENY if status = "confirmada" AND registration_fee > 0
    - ALLOW if status = "pendiente_pago"
    - ALLOW if status = "confirmada" AND (registration_fee = 0 OR NULL)
11. Perform soft delete: update status, set cancelledAt, cancelledBy
    ↓
    [deleteRegistrationAction]
12. Revalidate /instructor/events/[eventId]/enroll
13. Return success result
    ↓
    [DeleteRegistrationButton]
14. Show success toast
15. UI updates via revalidation (optimistic or server-driven)

```

## Components and Interfaces

### 1. Domain Layer

#### 1.1 Domain Error (NEW)
```

**File**: `modules/event-registration/domain/errors.ts`

Add new error class:

```typescript
export class CannotDeleteConfirmedPaidError extends Error {
  constructor() {
    super(
      "No se puede eliminar una inscripción confirmada de un evento de pago",
    );
    this.name = "CannotDeleteConfirmedPaidError";
  }
}
```

**Rationale**: Domain errors carry semantic meaning. This error represents the business rule that confirmed paid registrations cannot be deleted to prevent revenue loss.

#### 1.2 Domain Helper Function (OPTIONAL)

**File**: `modules/event-registration/domain/entities/eventRegistration.ts`

Optionally add a pure helper to determine deletability:

```typescript
export function isDeletable(
  status: RegistrationStatus,
  eventRegistrationFee: number | null,
): boolean {
  if (status === "cancelada") return false;
  if (status === "pendiente_pago") return true;
  if (status === "confirmada") {
    const isFreeEvent =
      eventRegistrationFee === null || eventRegistrationFee === 0;
    return isFreeEvent;
  }
  return false;
}
```

**Rationale**: Encapsulates the business rule in a testable pure function. Can be used both server-side (use case validation) and client-side (button visibility logic).

### 2. Application Layer

#### 2.1 Use Case: deleteStudentRegistration

**File**: `modules/event-registration/application/use-cases/deleteStudentRegistration.ts`

```typescript
import { IEventRegistrationRepository } from "../../domain/interfaces/eventRegistrationRepository";
import {
  RegistrationNotFoundError,
  CannotDeleteConfirmedPaidError,
} from "../../domain/errors";

export interface DeleteStudentRegistrationInput {
  registrationId: string;
  instructorId: string; // requesting instructor's practitioner ID
  eventRegistrationFee: number | null; // from martial_events.registration_fee
}

export async function deleteStudentRegistration(
  input: DeleteStudentRegistrationInput,
  repository: IEventRegistrationRepository,
): Promise<void> {
  // 1. Fetch registration
  const registration = await repository.findById(input.registrationId);

  if (!registration) {
    throw new RegistrationNotFoundError();
  }

  // 2. Authorization: verify instructor owns this registration
  if (registration.instructorId !== input.instructorId) {
    throw new RegistrationNotFoundError(); // deliberate: don't reveal existence
  }

  // 3. Business rule: cannot delete confirmed paid registrations
  const isPaidEvent =
    input.eventRegistrationFee !== null && input.eventRegistrationFee > 0;
  if (registration.status === "confirmada" && isPaidEvent) {
    throw new CannotDeleteConfirmedPaidError();
  }

  // 4. Business rule: cannot delete already cancelled registrations
  if (registration.status === "cancelada") {
    throw new RegistrationNotFoundError(); // treat as not found
  }

  // 5. Perform soft delete
  const now = new Date().toISOString();
  await repository.update({
    ...registration,
    status: "cancelada",
    cancelledAt: now,
    cancelledBy: input.instructorId,
    updatedAt: now,
  });
}
```

**Design Notes**:

- **Separation of Concerns**: Use case contains only business logic, no framework dependencies
- **Authorization**: Verifies instructorId ownership before allowing deletion
- **Deliberate 404**: If instructor doesn't own registration, throw RegistrationNotFoundError to avoid leaking existence
- **Immutability**: Spreads existing registration and updates specific fields
- **Soft Delete**: Sets status to "cancelada" with audit metadata

### 3. Infrastructure Layer

#### 3.1 Repository Update Method

**File**: `modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository.ts`

**Status**: ✅ Already exists

The `update()` method is already implemented in the repository (used by confirmPayment and cancelRegistration use cases). No changes needed.

```typescript
async update(registration: EventRegistration): Promise<void> {
  const { error } = await adminSupabase
    .from("event_registrations" as never)
    .update({
      status: registration.status,
      confirmed_at: registration.confirmedAt,
      confirmed_by: registration.confirmedBy,
      cancelled_at: registration.cancelledAt,
      cancelled_by: registration.cancelledBy,
      notes: registration.notes,
      updated_at: registration.updatedAt,
    } as never)
    .eq("id", registration.id);

  if (error)
    throw new DomainError(
      `Failed to update event registration: ${error.message}`,
    );
}
```

### 4. Presentation Layer

#### 4.1 Server Action: deleteRegistrationAction

**File**: `modules/event-registration/presentation/actions/deleteRegistrationAction.ts`

```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleEventRegistrationRepository } from "../../infrastructure/repositories/drizzleEventRegistrationRepository";
import { deleteStudentRegistration } from "../../application/use-cases/deleteStudentRegistration";
import {
  RegistrationNotFoundError,
  CannotDeleteConfirmedPaidError,
} from "../../domain/errors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

const DeleteRegistrationSchema = z.object({
  registrationId: z.string().uuid("ID de inscripción inválido"),
  eventId: z.string().uuid("ID de evento inválido"),
});
```

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"];

async function getInstructorPractitionerId(
authUserId: string
): Promise<string | null> {
const { data } = await adminSupabase
.from("practitioners")
.select("id, role")
.eq("auth_user_id", authUserId)
.maybeSingle();

if (!data || !INSTRUCTOR_ROLES.includes(data.role ?? "")) {
return null;
}

return data.id;
}

async function getEventRegistrationFee(eventId: string): Promise<number | null> {
const { data } = await adminSupabase
.from("martial_events")
.select("registration_fee")
.eq("id", eventId)
.maybeSingle();

return data?.registration_fee ?? null;
}

export async function deleteRegistrationAction(
rawInput: unknown
): Promise<ActionResult> {
// 1. Authentication
const user = await requireUser(); // redirects to /login if not authenticated

// 2. Authorization: verify instructor role
const instructorId = await getInstructorPractitionerId(user.id);
if (!instructorId) {
return {
success: false,
error: "No autorizado. Solo instructores pueden eliminar inscripciones.",
code: "FORBIDDEN",
};
}

// 3. Input validation
const parsed = DeleteRegistrationSchema.safeParse(rawInput);
if (!parsed.success) {
return {
success: false,
error: parsed.error.issues[0]?.message ?? "Datos inválidos",
code: "VALIDATION_ERROR",
};
}

const { registrationId, eventId } = parsed.data;

try {
// 4. Fetch event registration fee
const eventRegistrationFee = await getEventRegistrationFee(eventId);

    // 5. Execute use case (composition root)
    const repository = new DrizzleEventRegistrationRepository();
    await deleteStudentRegistration(
      {
        registrationId,
        instructorId,
        eventRegistrationFee,
      },
      repository
    );

    // 6. Revalidate enrollment page
    revalidatePath(`/instructor/events/${eventId}/enroll`);

    return { success: true, data: undefined };

} catch (err) {
return mapDomainError(err);
}
}

function mapDomainError(err: unknown): { success: false; error: string; code: string } {
if (err instanceof RegistrationNotFoundError) {
return {
success: false,
error: "Inscripción no encontrada",
code: "NOT_FOUND",
};
}
if (err instanceof CannotDeleteConfirmedPaidError) {
return {
success: false,
error: err.message,
code: "CANNOT_DELETE_CONFIRMED_PAID",
};
}
console.error("[deleteRegistrationAction] Unexpected error:", err);
return {
success: false,
error: "Error al eliminar la inscripción",
code: "INTERNAL_ERROR",
};
}

```

**Security Notes**:
- ✅ Authentication: `requireUser()` redirects if no session
- ✅ Authorization: Verifies instructor role before proceeding
- ✅ Input Validation: Zod schema validates UUID format
- ✅ Error Sanitization: Logs internal errors, returns safe message to client
- ✅ No Secrets: No environment variables or sensitive data exposed
```

#### 4.2 Client Component: DeleteRegistrationButton

**File**: `modules/event-registration/presentation/components/DeleteRegistrationButton.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { deleteRegistrationAction } from "../actions/deleteRegistrationAction";

interface Props {
  registrationId: string;
  eventId: string;
  studentName: string;
  onSuccess?: () => void;
}

export function DeleteRegistrationButton({
  registrationId,
  eventId,
  studentName,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRegistrationAction({ registrationId, eventId });

      if (result.success) {
        setShowConfirm(false);
        // Success toast (using your existing toast system)
        // toast.success("Inscripción eliminada correctamente");
        onSuccess?.();
      } else {
        // Error toast
        // toast.error(result.error);
        console.error(`[DeleteRegistrationButton] ${result.code}:`, result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error-400 bg-error-500/10 border border-error-500/30 rounded-lg hover:bg-error-500/20 hover:border-error-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Eliminar inscripción de ${studentName}`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Eliminar
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-error-500/20 rounded-full border border-error-500/30">
                <svg
                  className="w-6 h-6 text-error-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                  ¿Eliminar inscripción?
                </h3>
                <p className="text-sm text-neutral-400">
                  Estás a punto de eliminar la inscripción de{" "}
                  <span className="font-semibold text-neutral-200">{studentName}</span>.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-300 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-error-600 border border-error-600 rounded-lg hover:bg-error-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Design Notes**:

- ✅ Client Component: Uses hooks (useState, useTransition)
- ✅ Confirmation Dialog: Prevents accidental deletions
- ✅ Loading State: Disables button during pending transition
- ✅ Accessibility: aria-label for screen readers
- ✅ Error Handling: Logs errors, shows toast (system-dependent)

#### 4.3 Update EnrollTabs Component

**File**: `app/(dashboard)/instructor/events/[eventId]/enroll/EnrollTabs.tsx`

**Changes Required**:

1. Add `eventRegistrationFee` prop
2. Pass it to `RegisteredTab`
3. Extract `RegisteredTab` into a separate component file (optional, for organization)

```typescript
interface Props {
  eventId: string;
  students: Student[];
  registrations: Registration[];
  isCompetition: boolean;
  eventRegistrationFee: number | null; // NEW
}

export function EnrollTabs({
  eventId,
  students,
  registrations,
  isCompetition,
  eventRegistrationFee, // NEW
}: Props) {
  // ... existing code ...

  {activeTab === "inscritos" && (
    <RegisteredTab
      registrations={registrations}
      students={students}
      isCompetition={isCompetition}
      eventId={eventId}                    // NEW
      eventRegistrationFee={eventRegistrationFee} // NEW
    />
  )}
}
```

#### 4.4 Update RegisteredTab (within EnrollTabs or extracted)

**Location**: Inside `EnrollTabs.tsx` or new file `RegisteredTab.tsx`

**Changes**:

1. Add `eventId` and `eventRegistrationFee` props
2. Import `DeleteRegistrationButton` and `isDeletable` helper
3. Add delete button column in table
4. Conditionally render delete button based on `isDeletable()`

```typescript
import { DeleteRegistrationButton } from "@/modules/event-registration/presentation/components/DeleteRegistrationButton";
import { isDeletable } from "@/modules/event-registration/domain/entities/eventRegistration";

function RegisteredTab({
  registrations,
  students,
  isCompetition,
  eventId,                    // NEW
  eventRegistrationFee,       // NEW
}: {
  registrations: Registration[];
  students: Student[];
  isCompetition: boolean;
  eventId: string;            // NEW
  eventRegistrationFee: number | null; // NEW
}) {
  // ... existing code ...

  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-neutral-700 bg-neutral-900/80">
        <th className="text-left px-4 py-4 ...">Alumno</th>
        {isCompetition && <th className="text-left px-4 py-4 ...">Grado</th>}
        <th className="text-left px-4 py-4 ...">Estado</th>
        <th className="text-left px-4 py-4 ...">Inscrito el</th>
        <th className="text-right px-4 py-4 ...">Acciones</th> {/* NEW */}
      </tr>
    </thead>
    <tbody className="divide-y divide-neutral-800">
      {registrations.map((reg) => {
        const student = studentMap.get(reg.practitionerId);
        const canDelete = isDeletable(reg.status, eventRegistrationFee); // NEW

        return (
          <tr key={reg.id} ...>
            {/* ... existing cells ... */}
            <td className="px-4 py-4 text-right"> {/* NEW */}
              {canDelete && (
                <DeleteRegistrationButton
                  registrationId={reg.id}
                  eventId={eventId}
                  studentName={reg.practitionerName}
                />
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
}
```

#### 4.5 Update EnrollPage (page.tsx)

**File**: `app/(dashboard)/instructor/events/[eventId]/enroll/page.tsx`

**Changes**: Pass `registration_fee` from event to `EnrollTabs`

```typescript
export default async function EnrollPage({ params }: { params: Promise<{ eventId: string }> }) {
  // ... existing code fetches event ...

  return (
    <main className="...">
      {/* ... existing JSX ... */}

      <EnrollTabs
        eventId={eventId}
        students={students}
        registrations={myRegistrations}
        isCompetition={isCompetition}
        eventRegistrationFee={event.registration_fee} // NEW
      />
    </main>
  );
}
```

## Data Models

### EventRegistration (existing)

```typescript
export interface EventRegistration {
  id: string;
  eventId: string;
  practitionerId: string;
  instructorId: string;
  status: RegistrationStatus; // "pendiente_pago" | "confirmada" | "cancelada"
  registeredAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  cancelledAt: string | null; // Updated on soft delete
  cancelledBy: string | null; // Updated on soft delete
  notes: string | null;
  createdAt: string;
  updatedAt: string; // Updated on soft delete
}
```

### MartialEvent (partial, relevant fields)

```typescript
interface MartialEvent {
  id: string;
  name: string;
  registration_fee: number | null; // Key field for deletion logic
  // ... other fields
}
```

## Error Handling

### Domain Errors

| Error Class                      | When Thrown                                                       | HTTP Status | User Message                                                           |
| -------------------------------- | ----------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `RegistrationNotFoundError`      | Registration ID doesn't exist OR instructor doesn't own it        | 404         | "Inscripción no encontrada"                                            |
| `CannotDeleteConfirmedPaidError` | Trying to delete confirmed registration with registration_fee > 0 | 403         | "No se puede eliminar una inscripción confirmada de un evento de pago" |

### Server Action Error Codes

| Code                           | Meaning                                 | Returned When                                  |
| ------------------------------ | --------------------------------------- | ---------------------------------------------- |
| `VALIDATION_ERROR`             | Input failed Zod validation             | Invalid UUID format                            |
| `FORBIDDEN`                    | User not authorized                     | Not an instructor role                         |
| `NOT_FOUND`                    | Registration doesn't exist or not owned | Use case throws RegistrationNotFoundError      |
| `CANNOT_DELETE_CONFIRMED_PAID` | Business rule violation                 | Use case throws CannotDeleteConfirmedPaidError |
| `INTERNAL_ERROR`               | Unexpected server error                 | Unhandled exception                            |

## Testing Strategy

### Unit Tests

#### 1. Use Case Tests

**File**: `modules/event-registration/application/use-cases/deleteStudentRegistration.test.ts`

Test cases:

- ✅ **Success: Delete pending-payment registration** → status updated to "cancelada", audit fields set
- ✅ **Success: Delete confirmed free-event registration** → works when registration_fee = 0
- ✅ **Success: Delete confirmed free-event registration** → works when registration_fee = null
- ❌ **Error: Delete non-existent registration** → throws RegistrationNotFoundError
- ❌ **Error: Delete registration owned by different instructor** → throws RegistrationNotFoundError
- ❌ **Error: Delete confirmed paid registration** → throws CannotDeleteConfirmedPaidError
- ❌ **Error: Delete already cancelled registration** → throws RegistrationNotFoundError

#### 2. Domain Helper Tests

**File**: `modules/event-registration/domain/entities/eventRegistration.test.ts`

Test `isDeletable()` function:

- ✅ `isDeletable("pendiente_pago", 1000)` → true
- ✅ `isDeletable("confirmada", 0)` → true
- ✅ `isDeletable("confirmada", null)` → true
- ❌ `isDeletable("confirmada", 1000)` → false
- ❌ `isDeletable("cancelada", 0)` → false
- ❌ `isDeletable("cancelada", 1000)` → false

#### 3. Repository Tests (optional)

**File**: `modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository.test.ts`

Verify `update()` method correctly persists cancelledAt, cancelledBy, status changes (likely already covered by existing tests).

### Integration Tests

#### Server Action Integration

**File**: `modules/event-registration/presentation/actions/deleteRegistrationAction.test.ts`

Test scenarios:

- ✅ Authenticated instructor can delete own pending registration
- ✅ Authenticated instructor can delete own free-event confirmed registration
- ❌ Unauthenticated user is redirected (requireUser)
- ❌ Non-instructor user receives FORBIDDEN error
- ❌ Instructor cannot delete another instructor's registration
- ❌ Instructor cannot delete confirmed paid registration
- ❌ Invalid input (non-UUID) returns VALIDATION_ERROR
- ✅ Successful deletion triggers revalidatePath

### E2E Tests (Playwright/Cypress)

Test user flow:

1. Login as instructor
2. Navigate to event enrollment page
3. Verify delete button visible for pending registration
4. Verify delete button visible for free-event confirmed registration
5. Verify delete button NOT visible for paid-event confirmed registration
6. Click delete button → confirmation dialog appears
7. Click "Cancelar" → dialog closes, no deletion
8. Click delete button again → Click "Eliminar"
9. Verify success toast appears
10. Verify registration removed from table OR status shows "cancelada"
11. Verify event capacity count updated (if applicable)

### Manual Testing Checklist

- [ ] Instructor can see delete button on pending registrations
- [ ] Instructor can see delete button on free-event confirmed registrations
- [ ] Instructor CANNOT see delete button on paid-event confirmed registrations
- [ ] Instructor CANNOT see delete button on cancelled registrations
- [ ] Confirmation dialog shows student name and event context
- [ ] Cancelling confirmation dialog does not delete registration
- [ ] Confirming deletion removes registration from active list
- [ ] Success toast appears after successful deletion
- [ ] Error toast appears if deletion fails
- [ ] Page revalidates without full reload
- [ ] Event capacity updates correctly after deletion
- [ ] Another instructor cannot delete registrations they don't own (verify via API call)

## Security Considerations

### 1. Authentication

- ✅ **Session Verification**: `requireUser()` in server action redirects unauthenticated users to login
- ✅ **No Client-Side Auth**: Authorization logic never runs in browser, only server-side

### 2. Authorization

- ✅ **Role Check**: Server action verifies instructor role before allowing deletion
- ✅ **Ownership Check**: Use case verifies `instructorId` matches registration.instructorId
- ✅ **Information Disclosure Prevention**: If instructor doesn't own registration, return 404 (not 403) to avoid leaking existence

### 3. Input Validation

- ✅ **Zod Schema**: All inputs validated for type and format (UUID)
- ✅ **SQL Injection Prevention**: Using Drizzle ORM with parameterized queries
- ✅ **No Direct User Input in Queries**: registrationId and eventId validated before use

### 4. Data Exposure

- ✅ **No Sensitive Fields**: Server action returns only success/error, no internal data
- ✅ **Safe Error Messages**: Internal errors logged, generic message returned to client
- ✅ **Audit Trail**: Soft delete preserves who deleted and when (cancelledBy, cancelledAt)

### 5. CSRF Protection

- ✅ **Server Actions Built-in Protection**: Next.js Server Actions have CSRF protection by default
- ✅ **No GET Mutations**: Deletion only via POST (Server Action invocation)

### 6. Rate Limiting (Future Enhancement)

- ⚠️ **Consider**: Add rate limiting to prevent abuse (e.g., 10 deletions per minute per instructor)
- Implementation: Middleware or Redis-based limiter

## Performance Considerations

### Database Queries

1. **findById**: Single query by primary key (indexed) → fast
2. **getEventRegistrationFee**: Single query by primary key (indexed) → fast
3. **update**: Single update by primary key → fast

**Total queries per deletion**: 3 queries, all indexed

### Optimization Opportunities

1. **Combine Queries**: Fetch registration + event in parallel using `Promise.all()`
2. **Cache Event Data**: If registration_fee rarely changes, cache it per event
3. **Optimistic UI**: Update client state immediately, revert if server action fails

### Revalidation Strategy

- **Current**: `revalidatePath` revalidates entire `/instructor/events/[eventId]/enroll` page
- **Alternative**: Use `revalidateTag` with granular tags if multiple instructors edit same event simultaneously
- **Trade-off**: Full path revalidation is simpler and sufficient for single-instructor workflow

## Rollout Plan

### Phase 1: Core Implementation

1. Add `CannotDeleteConfirmedPaidError` to domain errors
2. Add `isDeletable()` helper to eventRegistration.ts (optional)
3. Implement `deleteStudentRegistration` use case
4. Implement `deleteRegistrationAction` server action
5. Create `DeleteRegistrationButton` component

### Phase 2: UI Integration

6. Update `EnrollTabs` to accept and pass `eventRegistrationFee`
7. Update `RegisteredTab` to render delete button conditionally
8. Update `page.tsx` to pass `registration_fee` to EnrollTabs
9. Add toast notifications for success/error feedback

### Phase 3: Testing

10. Write unit tests for use case
11. Write unit tests for `isDeletable()` helper
12. Write integration tests for server action
13. Manual testing across scenarios
14. E2E test for complete user flow

### Phase 4: Deployment

15. Deploy to staging environment
16. Smoke test with real instructor accounts
17. Monitor error logs for unexpected failures
18. Deploy to production
19. Monitor user feedback and error rates

## Alternative Approaches Considered

### 1. Hard Delete vs Soft Delete

**Decision**: Soft delete (update status to "cancelada")

**Rationale**:

- Preserves audit trail (who deleted, when)
- Allows potential "undo" feature in future
- Maintains referential integrity
- Common pattern in existing codebase (cancelRegistration use case)

### 2. Client-Side Deletability Check vs Server-Side Only

**Decision**: Both layers

**Rationale**:

- Client-side: Better UX (hide buttons for ineligible registrations)
- Server-side: Security (never trust client)
- `isDeletable()` helper ensures logic consistency

### 3. Single Action for All Roles vs Separate Instructor Action

**Decision**: Separate instructor action (deleteRegistrationAction)

**Rationale**:

- Admin already has cancelRegistration action (different authorization model)
- Instructor action specifically checks instructorId ownership
- Clearer separation of concerns
- Different UI contexts (admin portal vs instructor portal)

### 4. Pass Event Object vs Pass Registration Fee Only

**Decision**: Pass registration_fee only

**Rationale**:

- Minimize prop drilling
- Only fee is needed for deletability logic
- Cleaner component interface
- Event object contains irrelevant fields for this context

## Future Enhancements

1. **Undo Feature**: Allow instructors to restore recently deleted registrations within a time window
2. **Bulk Delete**: Select multiple registrations and delete in one action
3. **Delete Reasons**: Add optional reason field when deleting (notes)
4. **Email Notification**: Notify student when instructor removes their registration
5. **Admin Override**: Allow admins to delete any registration regardless of rules
6. **Soft Delete UI**: Show cancelled registrations in a separate "Historial" tab with restore option

---

## Summary

This design extends the existing event-registration module with deletion capability following Clean Architecture, SOLID principles, and Next.js best practices. The implementation spans four layers (domain, application, infrastructure, presentation) and maintains consistency with existing patterns (cancelRegistration use case, confirmPayment action structure).

Key characteristics:

- **Secure**: Multi-layer authorization, input validation, safe error handling
- **Maintainable**: Follows established module structure, clear separation of concerns
- **Testable**: Pure use case logic, mockable dependencies, comprehensive test strategy
- **User-Friendly**: Confirmation dialog, loading states, success/error feedback
- **Auditable**: Soft delete preserves who, when, and what was deleted
