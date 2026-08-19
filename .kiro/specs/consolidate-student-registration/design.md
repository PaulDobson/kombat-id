# Design Document: Student Registration Consolidation

## Overview

This design consolidates student registration by making `RegisterStudentsStep` reuse the existing `RegisterStudentForm` component, eliminating code duplication while preserving onboarding workflow features. The consolidation achieves:

- **Single source of truth**: One form component handles all student registration UI
- **Clear separation of concerns**: Form logic remains independent of workflow orchestration
- **Action consolidation**: One server action handles both onboarding and standard registration
- **Preserved workflow**: Session state management and multi-student registration remain intact
- **Type safety**: Strongly-typed interfaces ensure compile-time verification of component boundaries

The design follows Clean Architecture principles with clear layer boundaries: domain entities define data shapes, application use cases orchestrate business logic, infrastructure implements data access, and presentation adapters handle Next.js-specific concerns.

## Architecture

### Component Hierarchy

```
RegisterStudentsStep (Client Component - Workflow Orchestrator)
├── Session State Management
│   ├── registeredStudents: SessionStudent[]
│   └── onComplete: (students: SessionStudent[]) => void
│
└── RegisterStudentForm (Client Component - Reusable Form)
    ├── Props Interface
    │   ├── academyId?: string
    │   ├── simplifiedMode?: boolean
    │   └── onSuccess?: (result: { publicId: string }) => void
    │
    ├── Form State
    │   ├── fields: RegisterStudentFormData
    │   ├── isPending: boolean
    │   └── error: string | null
    │
    └── Server Action Call
        └── registerStudentAction (from instructorActions)
```

### Layer Responsibilities

**Presentation Layer** (`RegisterStudentForm`, `RegisterStudentsStep`):

- Render UI and handle user interactions
- Manage local form and workflow state
- Call server actions for mutations
- No business logic or data access

**Application Layer** (`registerStudentAction`):

- Composition root: instantiate repositories
- Validate inputs with Zod
- Coordinate use case execution
- Map domain errors to ActionResult

**Infrastructure Layer** (`DrizzleOrderRepository`, Supabase client):

- Execute database queries
- Send emails via external services
- Create auth accounts
- No business logic

### Data Flow

```
User Input → RegisterStudentForm (validation)
           ↓
           registerStudentAction (Server Action)
           ↓
           ├→ Authentication check (requireInstructorPractitioner)
           ├→ Input validation (Zod)
           ├→ Use case execution (registerPractitioner)
           ├→ Welcome email dispatch (parallel)
           └→ Admin notification (parallel)
           ↓
           ActionResult<{ publicId: string }>
           ↓
           RegisterStudentForm.onSuccess callback
           ↓
           RegisterStudentsStep adds to session state
           ↓
           Display in "Registered students" list
```

## Components and Interfaces

### RegisterStudentForm Component

**Purpose**: Self-contained form for student registration, usable in both onboarding and standard contexts.

**Type**: Client Component (`"use client"`)

**Props Interface**:

```typescript
interface RegisterStudentFormProps {
  /**
   * Optional academy to assign the student to.
   * If omitted, the action will use the instructor's first active academy.
   */
  academyId?: string;

  /**
   * When true, hides optional fields (gender, weight, height, martial art history)
   * and applies default values on submission.
   * Default: false
   */
  simplifiedMode?: boolean;

  /**
   * Callback invoked after successful registration.
   * Receives the publicId of the created practitioner.
   * Used by RegisterStudentsStep to add student to session state.
   */
  onSuccess?: (result: { publicId: string }) => void;
}
```

**Internal State**:

```typescript
interface RegisterStudentFormData {
  // Required fields (always visible)
  rut: string;
  fullName: string;
  studentEmail: string;
  birthDate: string; // YYYY-MM-DD format

  // Optional fields (hidden when simplifiedMode=true)
  gender: "male" | "female" | "other" | "";
  grade: "white" | "yellow" | "green" | "blue" | "red" | "black";
  startDate: string;
  weightKg: string;
  heightCm: string;
  martialArt: string;
  martialGrade: string;
}
```

**Behavior**:

1. **Rendering**:
   - Always renders: RUT, fullName, studentEmail, birthDate
   - Conditionally renders (when `!simplifiedMode`): gender, weight, height, martial art fields
   - Grade field always shows "Blanco" as read-only display

2. **Submission**:
   - Validates required fields (HTML5 + browser validation)
   - When `simplifiedMode=true`, applies defaults: `gender="other"`, `grade="white"`, `startDate=today`
   - Calls `registerStudentAction` with complete payload
   - On success: calls `onSuccess` callback, resets form to initial state
   - On error: displays error message inline

3. **Styling**:
   - No forced container styling
   - Inherits styling from parent container
   - Input fields use project design system classes
   - Accessible form controls with proper labels and ARIA attributes

**Dependencies**:

- `registerStudentAction` from `@/modules/practitioner-identity/presentation/actions/instructorActions`
- `useTransition` from React for pending state
- No dependencies on `@/modules/instructor-onboarding`

### RegisterStudentsStep Component

**Purpose**: Onboarding-specific orchestrator for multi-student sequential registration.

**Type**: Client Component (`"use client"`)

**Props Interface**:

```typescript
interface RegisterStudentsStepProps {
  /**
   * The academy ID to assign students to.
   * Passed through to RegisterStudentForm.
   */
  academyId: string;

  /**
   * Callback invoked when the step is complete.
   * Receives the array of students registered during this session.
   */
  onComplete: (students: SessionStudent[]) => void;
}
```

**Internal State**:

```typescript
interface SessionStudent {
  practitionerId: string;
  fullName: string;
  email: string;
  temporaryPassword: string; // Created by registerStudentAction
}
```

**State Management**:

```typescript
const [registeredStudents, setRegisteredStudents] = useState<SessionStudent[]>(
  [],
);
```

**Behavior**:

1. **Rendering**:
   - Header with instructions
   - "Registered students" list (visible when `registeredStudents.length > 0`)
   - `RegisterStudentForm` with `simplifiedMode={true}` and `academyId` prop
   - Navigation buttons:
     - "Skip" → calls `onComplete([])` (empty array)
     - "Continue (N)" → calls `onComplete(registeredStudents)` (disabled when N=0)

2. **Success Handler**:

   ```typescript
   async function handleFormSuccess(result: { publicId: string }) {
     // Query the created practitioner to get full details
     const student = await fetchPractitionerDetails(result.publicId);

     setRegisteredStudents((prev) => [
       ...prev,
       {
         practitionerId: student.id,
         fullName: student.fullName,
         email: student.contactEmail,
         temporaryPassword: student.temporaryPassword, // returned by action
       },
     ]);
   }
   ```

3. **Data Retrieval**:
   - When `registerStudentAction` returns `{ success: true, data: { publicId } }`, the step needs full student details
   - **Option A** (Recommended): Expand action return type to include needed fields:
     ```typescript
     return {
       success: true,
       data: {
         publicId: string,
         fullName: string,
         email: string,
         temporaryPassword: string | undefined,
       },
     };
     ```
   - **Option B**: Query practitioner record after creation (requires additional Server Action)

4. **Session State Lifecycle**:
   - State exists only in component memory
   - Passed to next step via `onComplete` callback
   - Not persisted to database until welcome email step

**Styling**:

- Wraps `RegisterStudentForm` in styled container matching onboarding design:
  ```typescript
  <div className="space-y-4 bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
    <RegisterStudentForm
      academyId={academyId}
      simplifiedMode={true}
      onSuccess={handleFormSuccess}
    />
  </div>
  ```

## Data Models

### ActionResult Type

```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };
```

### RegisterStudentAction Input

```typescript
const RegisterStudentInputSchema = z.object({
  // Required fields
  rut: z.string().min(1).max(20),
  fullName: z.string().min(1).max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // Optional fields (simplified mode provides defaults)
  gender: z.enum(["male", "female", "other"]).default("other"),
  grade: z
    .enum(["white", "yellow", "green", "blue", "red", "black"])
    .default("white"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default(() => new Date().toISOString().slice(0, 10)),

  // Optional profile fields
  studentEmail: z.string().email().optional().or(z.literal("")),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().int().positive().optional(),
  martialArt: z.string().max(100).optional(),
  martialGrade: z.string().max(50).optional(),

  // Context field
  academyId: z.string().uuid().optional(),
});

type RegisterStudentInput = z.infer<typeof RegisterStudentInputSchema>;
```

### RegisterStudentAction Return Type

**Current**:

```typescript
ActionResult<{ publicId: string }>;
```

**Enhanced** (Requirement 4):

```typescript
ActionResult<{
  publicId: string;
  fullName: string;
  email: string;
  temporaryPassword?: string; // Only present if auth account was created
}>;
```

### SessionStudent Interface

```typescript
interface SessionStudent {
  practitionerId: string;
  fullName: string;
  email: string;
  temporaryPassword: string;
}
```

**Usage**:

- Stored in `RegisterStudentsStep` component state
- Passed to `WelcomeEmailsStep` via `onComplete` callback
- Not persisted to database during registration step

## Action Consolidation Strategy

### Current State

**Two separate actions**:

1. **Onboarding Action** (`onboardingActions.registerStudentAction`):
   - Creates auth user with temporary password
   - Creates practitioner with `is_active=false`, `role="alumno"`
   - Assigns to academy
   - Returns `SessionStudent` (includes temporaryPassword)
   - Used only by `RegisterStudentsStep`

2. **Instructor Action** (`instructorActions.registerStudentAction`):
   - Resolves auth account (creates if needed)
   - Creates practitioner via `registerPractitioner` use case
   - Sets `is_active=false` after creation
   - Assigns to academy
   - Sends welcome email if auth created
   - Notifies admins
   - Returns `{ publicId: string }`
   - Used by `RegisterStudentForm`, `RegisterStudentModal`, `RegisterStudentSection`

### Consolidated Approach

**Single action** (`instructorActions.registerStudentAction`):

**Changes Required**:

1. **Expand return type** to include fields needed by onboarding:

   ```typescript
   ActionResult<{
     publicId: string;
     fullName: string;
     email: string;
     temporaryPassword?: string;
   }>;
   ```

2. **Return temporary password** when auth account is created:

   ```typescript
   const authAccountResult = await resolveStudentAuthAccount(studentEmail);

   return {
     success: true,
     data: {
       publicId: result.publicId,
       fullName: parsed.data.fullName,
       email: studentEmail ?? "",
       temporaryPassword:
         "temporaryPassword" in authAccountResult
           ? authAccountResult.temporaryPassword
           : undefined,
     },
   };
   ```

3. **Keep existing behavior**:
   - `is_active=false` (already implemented)
   - Academy membership creation (already implemented)
   - Welcome email dispatch (already implemented)
   - Admin notifications (already implemented)

### Migration Path

1. **Phase 1**: Enhance `instructorActions.registerStudentAction`
   - Expand return type
   - Return additional fields
   - No breaking changes (existing consumers ignore extra fields)

2. **Phase 2**: Update `RegisterStudentForm`
   - Add `simplifiedMode` prop
   - Add `onSuccess` callback prop
   - Switch to calling `instructorActions.registerStudentAction`

3. **Phase 3**: Update `RegisterStudentsStep`
   - Remove duplicate form markup
   - Render `RegisterStudentForm` component
   - Use `onSuccess` callback to populate session state

4. **Phase 4**: Deprecation
   - Mark `onboardingActions.registerStudentAction` as deprecated
   - Add JSDoc warning pointing to new action
   - Remove after verifying all consumers migrated

5. **Phase 5**: Cleanup
   - Delete deprecated action
   - Update imports
   - Run integration tests

### Rollback Plan

If critical issues discovered:

1. **Immediate**: Revert `RegisterStudentsStep` to use duplicate form markup
2. **Restore**: Re-export `onboardingActions.registerStudentAction` if deleted
3. **Fix**: Address root cause
4. **Re-deploy**: Follow migration path with fixes

## Error Handling

### RegisterStudentForm Error Display

**Validation Errors** (Zod schema failures):

```typescript
if (!parsed.success) {
  return {
    success: false,
    error: "Por favor revisa los campos requeridos",
    code: "VALIDATION_ERROR",
  };
}
```

**Display**: Inline error message below submit button

```tsx
{
  error && (
    <p
      role="alert"
      className="text-sm text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-xl px-4 py-2.5"
    >
      {error}
    </p>
  );
}
```

**Domain Errors** (DuplicateRutError):

```typescript
catch (err) {
  if (err instanceof DuplicateRutError) {
    return {
      success: false,
      error: "Ya existe un practicante con ese RUT",
      code: "DUPLICATE_RUT",
    };
  }
  // ... other domain errors
}
```

**Display**: Same inline location, user can correct and retry

**Clearing Errors**:

```typescript
function handleChange(
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
) {
  setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  setError(null); // Clear previous error
}
```

### RegisterStudentsStep Error Handling

**Registration Failure**:

- Error displayed in form (handled by `RegisterStudentForm`)
- Session state unchanged
- User can correct and retry
- Previously registered students remain in list

**Partial Failure**:

- Some students registered successfully
- Later registration fails
- User sees successful registrations in list
- Can retry failed registration
- Can skip and continue with partial list

**Navigation State**:

```typescript
<button
  type="button"
  disabled={registeredStudents.length === 0 || isPending}
  onClick={() => onComplete(registeredStudents)}
  className="..."
>
  Continuar ({registeredStudents.length})
</button>
```

### Error Recovery Flow

```
User submits form
↓
Validation error → Display inline → User corrects → Retry
↓
DuplicateRutError → Display inline → User changes RUT → Retry
↓
Network error → Display inline → User retries (form state preserved)
↓
Success → Clear form → Add to session list → Ready for next student
```

## Testing Strategy

### Unit Tests

**RegisterStudentForm Tests**:

```typescript
describe("RegisterStudentForm", () => {
  describe("Simplified Mode", () => {
    it("should hide optional fields when simplifiedMode=true", () => {
      render(<RegisterStudentForm simplifiedMode={true} />);
      expect(screen.queryByLabelText(/género/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/peso/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/altura/i)).not.toBeInTheDocument();
    });

    it("should show optional fields when simplifiedMode=false", () => {
      render(<RegisterStudentForm simplifiedMode={false} />);
      expect(screen.getByLabelText(/género/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/peso/i)).toBeInTheDocument();
    });

    it("should apply default values when simplifiedMode=true", async () => {
      const mockAction = vi.fn().mockResolvedValue({ success: true, data: { publicId: "123" } });
      // ... render, fill required fields, submit
      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          gender: "other",
          grade: "white",
          startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        })
      );
    });
  });

  describe("Success Callback", () => {
    it("should invoke onSuccess callback after successful registration", async () => {
      const handleSuccess = vi.fn();
      const mockAction = vi.fn().mockResolvedValue({
        success: true,
        data: { publicId: "123", fullName: "Juan", email: "juan@test.cl", temporaryPassword: "pass" },
      });

      render(<RegisterStudentForm onSuccess={handleSuccess} />);
      // ... fill and submit form

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalledWith({ publicId: "123", fullName: "Juan", email: "juan@test.cl", temporaryPassword: "pass" });
      });
    });

    it("should reset form after successful registration", async () => {
      render(<RegisterStudentForm />);
      // ... fill and submit successfully
      await waitFor(() => {
        expect(screen.getByLabelText(/rut/i)).toHaveValue("");
        expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when action fails", async () => {
      const mockAction = vi.fn().mockResolvedValue({
        success: false,
        error: "Ya existe un practicante con ese RUT",
        code: "DUPLICATE_RUT",
      });

      render(<RegisterStudentForm />);
      // ... fill and submit

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/ya existe un practicante/i);
      });
    });

    it("should clear error when user modifies fields", async () => {
      render(<RegisterStudentForm />);
      // ... trigger error
      const input = screen.getByLabelText(/rut/i);
      fireEvent.change(input, { target: { value: "new-value" } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
```

**RegisterStudentsStep Tests**:

```typescript
describe("RegisterStudentsStep", () => {
  it("should render RegisterStudentForm with correct props", () => {
    render(<RegisterStudentsStep academyId="academy-123" onComplete={vi.fn()} />);
    // Verify RegisterStudentForm is rendered
    // Verify simplifiedMode=true
    // Verify academyId prop passed
  });

  it("should add student to session state on successful registration", async () => {
    const handleComplete = vi.fn();
    render(<RegisterStudentsStep academyId="academy-123" onComplete={handleComplete} />);

    // Simulate form submission and success
    // ... trigger onSuccess callback

    await waitFor(() => {
      expect(screen.getByText(/juan pérez/i)).toBeInTheDocument();
      expect(screen.getByText(/continuar \(1\)/i)).toBeInTheDocument();
    });
  });

  it("should call onComplete with empty array when skip is clicked", () => {
    const handleComplete = vi.fn();
    render(<RegisterStudentsStep academyId="academy-123" onComplete={handleComplete} />);

    fireEvent.click(screen.getByText(/omitir/i));
    expect(handleComplete).toHaveBeenCalledWith([]);
  });

  it("should disable continue button when no students registered", () => {
    render(<RegisterStudentsStep academyId="academy-123" onComplete={vi.fn()} />);
    expect(screen.getByText(/continuar \(0\)/i)).toBeDisabled();
  });

  it("should enable continue button when students registered", async () => {
    render(<RegisterStudentsStep academyId="academy-123" onComplete={vi.fn()} />);
    // ... register a student
    await waitFor(() => {
      expect(screen.getByText(/continuar \(1\)/i)).not.toBeDisabled();
    });
  });

  it("should preserve registered students after registration error", async () => {
    render(<RegisterStudentsStep academyId="academy-123" onComplete={vi.fn()} />);
    // Register student 1 successfully
    // Attempt student 2 with error
    // Verify student 1 still in list
    expect(screen.getByText(/juan pérez/i)).toBeInTheDocument();
    expect(screen.getByText(/continuar \(1\)/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

**End-to-End Onboarding Flow**:

```typescript
describe("Onboarding Student Registration Integration", () => {
  it("should complete full registration flow", async () => {
    // 1. Setup: authenticated instructor, created academy
    const { instructor, academy } = await setupTestInstructor();

    // 2. Navigate to onboarding
    await page.goto("/instructor");

    // 3. Create academy step (skip or complete)
    await page.click('[data-testid="select-existing-academy"]');

    // 4. Register students step
    await page.fill('[name="rut"]', "12345678-9");
    await page.fill('[name="fullName"]', "Juan Pérez");
    await page.fill('[name="email"]', "juan@test.cl");
    await page.fill('[name="birthDate"]', "2010-01-15");
    await page.click('[type="submit"]');

    // 5. Verify student added to list
    await expect(page.locator("text=Juan Pérez")).toBeVisible();
    await expect(page.locator("text=Continuar (1)")).toBeVisible();

    // 6. Register second student
    await page.fill('[name="rut"]', "98765432-1");
    await page.fill('[name="fullName"]', "María López");
    await page.fill('[name="email"]', "maria@test.cl");
    await page.fill('[name="birthDate"]', "2011-03-20");
    await page.click('[type="submit"]');

    // 7. Verify both students in list
    await expect(page.locator("text=Juan Pérez")).toBeVisible();
    await expect(page.locator("text=María López")).toBeVisible();
    await expect(page.locator("text=Continuar (2)")).toBeVisible();

    // 8. Continue to welcome emails step
    await page.click("text=Continuar (2)");

    // 9. Verify students passed to next step
    await expect(
      page.locator("text=Enviar emails de bienvenida"),
    ).toBeVisible();
    await expect(page.locator("text=Juan Pérez")).toBeVisible();
    await expect(page.locator("text=María López")).toBeVisible();

    // 10. Verify database state
    const students = await db.query.practitionersTable.findMany({
      where: eq(practitionersTable.instructorId, instructor.id),
    });
    expect(students).toHaveLength(2);
    expect(students.every((s) => s.isActive === false)).toBe(true);
    expect(students.every((s) => s.role === "alumno")).toBe(true);
  });

  it("should handle skip with zero students", async () => {
    await setupTestInstructor();
    await page.goto("/instructor");

    // Skip student registration
    await page.click("text=Omitir");

    // Should proceed to welcome emails with empty list
    await expect(
      page.locator("text=Enviar emails de bienvenida"),
    ).toBeVisible();
    await expect(page.locator("text=No hay estudiantes")).toBeVisible();
  });
});
```

**Action Consolidation Verification**:

```typescript
describe("registerStudentAction Consolidation", () => {
  it("should create student with same database state as onboarding action", async () => {
    const instructor = await createTestInstructor();
    const academy = await createTestAcademy(instructor.id);

    // Call consolidated action
    const result = await registerStudentAction({
      rut: "12345678-9",
      fullName: "Test Student",
      birthDate: "2010-01-15",
      studentEmail: "test@student.cl",
      academyId: academy.id,
    });

    expect(result.success).toBe(true);

    // Verify database state
    const student = await db.query.practitionersTable.findFirst({
      where: eq(practitionersTable.id, result.data.publicId),
    });

    expect(student).toMatchObject({
      fullName: "Test Student",
      rut: "12345678-9",
      role: "alumno",
      isActive: false,
      grade: "white",
      instructorId: instructor.id,
    });

    // Verify academy membership
    const membership = await db.query.academyMembershipsTable.findFirst({
      where: and(
        eq(academyMembershipsTable.practitionerId, student.id),
        eq(academyMembershipsTable.academyId, academy.id),
      ),
    });
    expect(membership).toBeTruthy();
    expect(membership.isActive).toBe(true);
  });

  it("should return temporary password when auth account created", async () => {
    const result = await registerStudentAction({
      rut: "12345678-9",
      fullName: "Test Student",
      birthDate: "2010-01-15",
      studentEmail: "new@student.cl",
    });

    expect(result.success).toBe(true);
    expect(result.data.temporaryPassword).toBeDefined();
    expect(typeof result.data.temporaryPassword).toBe("string");
  });

  it("should send welcome email when auth account created", async () => {
    const emailSpy = vi.spyOn(emailService, "sendStudentWelcomeEmail");

    await registerStudentAction({
      rut: "12345678-9",
      fullName: "Test Student",
      birthDate: "2010-01-15",
      studentEmail: "test@student.cl",
    });

    expect(emailSpy).toHaveBeenCalledWith(
      "test@student.cl",
      "Test Student",
      expect.any(String), // temporary password
    );
  });
});
```

### Manual Testing Checklist

- [ ] RegisterStudentsStep renders form in simplified mode
- [ ] Only required fields visible (RUT, name, email, birthdate)
- [ ] Submit creates student with is_active=false
- [ ] Student added to "Registered students" list
- [ ] Form resets after successful submission
- [ ] Can register multiple students sequentially
- [ ] Skip button works with zero students
- [ ] Continue button disabled when list empty
- [ ] Continue button shows correct count
- [ ] Session state preserved during registration
- [ ] Error displays inline and can be retried
- [ ] Welcome emails sent with temporary passwords
- [ ] Admin notifications sent for new students
- [ ] Students appear in instructor's academy list
- [ ] RegisterStudentForm works in non-onboarding contexts (modal, section)
- [ ] Full field set visible when simplifiedMode=false

## Security Considerations

### Authentication

**Every Server Action verifies session**:

```typescript
export async function registerStudentAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // Step 1: Authentication — MANDATORY
  const auth = await requireInstructorPractitioner();
  if (!auth.ok) {
    return { success: false, error: auth.error, code: auth.code };
  }
  // ... rest of action
}
```

### Authorization

**Verify instructor has permission for academy**:

```typescript
async function resolveAcademyForInstructor(
  instructorId: string,
  targetAcademyId: string | undefined,
): Promise<{ academyId: string | undefined }> {
  if (targetAcademyId) {
    const { data } = await supabase
      .from("academies")
      .select("id")
      .eq("id", targetAcademyId)
      .contains("responsible_instructor_ids", [instructorId]) // Authorization check
      .eq("is_active", true)
      .maybeSingle();

    return { academyId: data?.id ?? undefined };
  }
  // ... fallback logic
}
```

### Input Validation

**All inputs validated with Zod**:

```typescript
const parsed = RegisterStudentInputSchema.safeParse(rawInput);
if (!parsed.success) {
  return {
    success: false,
    error: parsed.error.message,
    code: "VALIDATION_ERROR",
  };
}
```

**No trust in client-provided data**:

- RUT format validated
- Email format validated
- Date format validated
- String lengths constrained
- Enum values constrained

### Data Exposure

**Never return sensitive data**:

```typescript
// ❌ WRONG — returning full user record
return { success: true, data: user };

// ✅ CORRECT — returning only needed fields
return {
  success: true,
  data: {
    publicId: result.publicId,
    fullName: parsed.data.fullName,
    email: studentEmail ?? "",
    temporaryPassword: tempPassword, // OK — needed for welcome email
  },
};
```

**Temporary password handling**:

- Generated server-side only
- Returned only to creating instructor
- Sent via email to student
- Student must change on first login (enforced by auth system)

### Error Handling

**No internal details leaked**:

```typescript
catch (err) {
  if (err instanceof DuplicateRutError) {
    return { success: false, error: "Ya existe un practicante con ese RUT", code: "DUPLICATE_RUT" };
  }
  console.error("[registerStudentAction] Unexpected error:", err); // Server log only
  return {
    success: false,
    error: "Error interno del servidor", // Generic message to client
    code: "INTERNAL_ERROR",
  };
}
```

## Performance Considerations

### Parallel Operations

**Execute independent operations concurrently**:

```typescript
// Mark student inactive and create academy membership in parallel
await Promise.all([
  supabase
    .from("practitioners")
    .update({ is_active: false })
    .eq("id", result.publicId),
  academyResult.academyId
    ? supabase.from("academy_memberships").insert({ ... })
    : Promise.resolve(),
]);
```

**Non-blocking notifications**:

```typescript
// Send email and notify admins in parallel (non-blocking)
await Promise.all([
  studentEmail && tempPassword
    ? sendStudentWelcomeEmail(studentEmail, fullName, tempPassword).catch(logError)
    : Promise.resolve(),
  notifyAdminsNewStudent({ ... }).catch(logError),
]);
```

### Form Optimization

**Debounce validation** (future enhancement):

```typescript
// Debounce RUT uniqueness check
const debouncedCheckRut = useMemo(
  () => debounce((rut: string) => checkRutAvailability(rut), 500),
  [],
);
```

**Optimistic UI** (future enhancement):

```typescript
// Add student to list immediately, remove on error
const [optimisticStudents, addOptimistic] = useOptimistic(
  registeredStudents,
  (state, newStudent) => [...state, newStudent],
);
```

### Revalidation Strategy

**Targeted path revalidation**:

```typescript
revalidatePath("/instructor");
if (targetAcademyId) {
  revalidatePath(`/instructor/academies/${targetAcademyId}`);
}
```

**Avoid over-revalidation**:

- Don't revalidate entire app
- Don't revalidate unrelated routes
- Cache academy queries with appropriate TTL

## Migration Plan

### Phase 1: Enhance registerStudentAction (Day 1)

**Changes**:

1. Expand return type to include fullName, email, temporaryPassword
2. Return additional fields in success response
3. Test existing consumers (RegisterStudentForm, RegisterStudentModal) — should ignore extra fields

**Validation**:

```bash
pnpm test -- registerStudentAction
```

**Rollback**: Revert single commit

### Phase 2: Add simplifiedMode to RegisterStudentForm (Day 1)

**Changes**:

1. Add `simplifiedMode?: boolean` prop
2. Conditionally render optional fields
3. Apply default values when simplifiedMode=true
4. Add `onSuccess?: (result) => void` callback prop

**Validation**:

```bash
pnpm test -- RegisterStudentForm
```

**Rollback**: Revert single commit

### Phase 3: Refactor RegisterStudentsStep (Day 2)

**Changes**:

1. Remove duplicate form markup
2. Import and render RegisterStudentForm
3. Pass simplifiedMode={true}, academyId, onSuccess props
4. Implement handleFormSuccess to populate session state
5. Keep navigation buttons and registered students list

**Validation**:

```bash
pnpm test -- RegisterStudentsStep
# Manual testing of full onboarding flow
```

**Rollback**: Revert to original RegisterStudentsStep implementation

### Phase 4: Deprecate onboardingActions.registerStudentAction (Day 3)

**Changes**:

1. Add JSDoc deprecation warning:
   ```typescript
   /**
    * @deprecated Use instructorActions.registerStudentAction instead.
    * This action will be removed in the next release.
    */
   export async function registerStudentAction(...)
   ```
2. Add console warning:
   ```typescript
   console.warn(
     "[DEPRECATED] onboardingActions.registerStudentAction is deprecated. Use instructorActions.registerStudentAction instead.",
   );
   ```

**Validation**:

- Verify no calls to deprecated action in codebase
- Check build output for deprecation warnings

### Phase 5: Integration Testing (Day 3-4)

**Test Scenarios**:

1. Complete onboarding flow with student registration
2. Skip student registration step
3. Register multiple students sequentially
4. Handle registration errors and retry
5. Verify database state matches expectations
6. Verify welcome emails sent
7. Verify admin notifications sent

**Acceptance Criteria**:

- All integration tests pass
- Manual onboarding flow completes successfully
- No console errors or warnings
- Database state correct
- Emails sent correctly

### Phase 6: Remove Deprecated Action (Day 5)

**Changes**:

1. Delete `onboardingActions.registerStudentAction`
2. Remove imports of deprecated action
3. Update test mocks

**Validation**:

```bash
pnpm build
pnpm test
```

**Rollback Plan**:

- Git revert to previous commit
- Re-add deprecated action temporarily
- Address any missed dependencies
- Re-attempt removal

### Success Metrics

- [ ] Zero duplicate form field rendering logic
- [ ] Single source of truth for student registration UI
- [ ] One server action handles all student registration
- [ ] All tests passing (unit, integration, e2e)
- [ ] No regression in existing registration flows
- [ ] Onboarding flow works identically to before
- [ ] Code complexity reduced (measured by lines of code, cyclomatic complexity)
- [ ] No performance degradation (measured by action response time)

## Deployment Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing completed on staging
- [ ] Database migrations applied (none required for this change)
- [ ] Environment variables verified (none required for this change)
- [ ] Performance benchmarks within acceptable range
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Security review completed
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Rollback plan documented and tested
- [ ] Monitoring/alerting configured for new action
- [ ] Feature flag enabled (if using gradual rollout)

## Future Enhancements

### 1. Batch Registration Import

**Feature**: Upload CSV file to register multiple students at once

**Design**:

- Client Component accepts CSV file
- Parse CSV on client, validate format
- Server Action accepts array of student records
- Transaction-based insertion with rollback on any failure
- Return summary: successful, failed, duplicate

**Benefits**:

- Faster onboarding for large academies
- Reduces repetitive data entry

### 2. RUT Validation Service

**Feature**: Real-time RUT format validation and uniqueness check

**Design**:

- Debounced Server Action: `checkRutAvailability(rut: string)`
- Returns: `{ available: boolean, formatted: string }`
- Display inline feedback as user types

**Benefits**:

- Prevent submission errors
- Better user experience
- Reduce duplicate registration attempts

### 3. Field Pre-fill from Previous Student

**Feature**: Option to copy common fields from previous registration

**Design**:

- "Copy from previous" button
- Pre-fills: academy, grade, startDate, martialArt
- User only updates: RUT, name, email, birthdate

**Benefits**:

- Faster sequential registration
- Reduce data entry errors

### 4. Student Photo Upload

**Feature**: Upload student photo during registration

**Design**:

- Optional file input in form
- Upload to storage bucket (Supabase Storage)
- Store path in practitioner record
- Display thumbnail in registered students list

**Benefits**:

- Visual identification
- Complete student profile earlier

### 5. Parent/Guardian Contact

**Feature**: Add parent contact information for minors

**Design**:

- Conditional fields based on birthdate (age < 18)
- Parent name, phone, email
- Store in separate `guardian_contacts` table

**Benefits**:

- Compliance with data protection for minors
- Enable parent communication

### 6. Academy Transfer

**Feature**: Transfer student from one academy to another

**Design**:

- New Server Action: `transferStudentToAcademy`
- Updates academy_memberships (deactivate old, create new)
- Maintains history
- Requires authorization check

**Benefits**:

- Handle student moves between locations
- Preserve student history

## Appendix

### Component Dependency Graph

```
RegisterStudentsStep
├── useState (React)
├── RegisterStudentForm
│   ├── useTransition (React)
│   ├── registerStudentAction (Server Action)
│   └── onSuccess callback
└── onComplete callback
```

### Action Call Flow

```
1. User fills form in RegisterStudentForm
2. Form submission → registerStudentAction (Server Action)
3. Action validates input → executes use case → creates student
4. Action returns ActionResult<{ publicId, fullName, email, temporaryPassword }>
5. RegisterStudentForm calls onSuccess callback with result
6. RegisterStudentsStep receives callback → adds to session state
7. RegisterStudentsStep updates UI with new student in list
8. Form resets, ready for next student
```

### Database Schema (Relevant Tables)

**practitioners**:

```sql
CREATE TABLE practitioners (
  id UUID PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  rut VARCHAR(20) NOT NULL UNIQUE,
  birth_date DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  instructor_id UUID REFERENCES practitioners(id),
  auth_user_id UUID REFERENCES auth.users(id),
  contact_email VARCHAR(100),
  weight_kg NUMERIC(5, 2),
  height_cm INTEGER,
  martial_art VARCHAR(100),
  martial_grade VARCHAR(50),
  qr_token UUID NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**academy_memberships**:

```sql
CREATE TABLE academy_memberships (
  id UUID PRIMARY KEY,
  academy_id UUID NOT NULL REFERENCES academies(id),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(academy_id, practitioner_id)
);
```

### Type Definitions Reference

```typescript
// From @/lib/types
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// From instructor-onboarding module
interface SessionStudent {
  practitionerId: string;
  fullName: string;
  email: string;
  temporaryPassword: string;
}

// RegisterStudentForm props
interface RegisterStudentFormProps {
  academyId?: string;
  simplifiedMode?: boolean;
  onSuccess?: (result: {
    publicId: string;
    fullName: string;
    email: string;
    temporaryPassword?: string;
  }) => void;
}

// RegisterStudentsStep props
interface RegisterStudentsStepProps {
  academyId: string;
  onComplete: (students: SessionStudent[]) => void;
}
```
