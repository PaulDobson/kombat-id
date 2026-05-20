# Instructor Module Refactor — Tasks

## Task 1: Create shared ActionResult type and presentation constants

### 1.1 Define ActionResult<T> in lib/types.ts

- Create `/src/lib/types.ts` exporting `type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string; code: string }`
- This eliminates the local redefinition in every action file

### 1.2 Create shared presentation constants

- Create `/src/lib/presentation-constants.ts` exporting:
  - `GRADE_LABELS: Record<string, string>`
  - `GRADE_STYLES: Record<string, string>`
  - `REGION_LABELS: Record<ChileanRegion, string>`
  - `EXAM_STATUS_LABELS: Record<string, string>`
  - `EXAM_STATUS_STYLES: Record<string, string>`
  - `RESULT_LABELS: Record<string, string>`
  - `RESULT_STYLES: Record<string, string>`
  - `CERT_TYPE_LABELS: Record<string, string>`
  - `EVENT_TYPE_LABELS: Record<string, string>`
  - `EVENT_TYPE_STYLES: Record<string, string>`

---

## Task 2: Create requireInstructor() lib helper

### 2.1 Add requireInstructor() to lib/supabase/server.ts (or new lib/auth-guards.ts)

- Create `/src/lib/auth-guards.ts` with `requireInstructor()` that:
  - Calls `requireUser()` internally
  - Queries `practitioners` via `adminSupabase` for the auth user
  - Checks `isInstructorRole()`
  - Returns `{ user, practitioner: { id, role, fullName } }` or redirects to `/dashboard`
- This replaces the duplicated inline auth guard in every instructor page

---

## Task 3: Extract "is student in my academy?" authorization to a use case

### 3.1 Create verifyInstructorStudentAccess use case

- Create `/src/modules/practitioner-identity/application/use-cases/verifyInstructorStudentAccess.ts`
- Input: `{ instructorId: string; studentId: string }`
- Dependencies: `{ adminClient }` (or a membership repository interface)
- Returns: `boolean`
- Logic: checks `instructor_id` direct assignment OR academy membership overlap
- Replace the 3 copy-pasted authorization blocks in:
  - `students/[id]/page.tsx`
  - `students/[id]/edit/page.tsx`
  - `instructorActions.ts` (`updateStudentProfileAction`)

---

## Task 4: Move admin certification actions out of instructorActions.ts

### 4.1 Move admin actions to the correct file

- Move `approveCertificationRequestAction`, `rejectCertificationRequestAction`, `observeCertificationRequestAction` from `instructorActions.ts` to the existing admin certification actions file (check if `/src/app/(dashboard)/admin/certification-requests/` has an actions file, otherwise create one at `modules/practitioner-identity/presentation/actions/adminCertificationActions.ts`)
- Update all import references

---

## Task 5: Replace local INSTRUCTOR_ROLES constants with lib/roles import

### 5.1 Fix pages with local INSTRUCTOR_ROLES definition

- `grade-exams/page.tsx` — remove local const, import `isInstructorRole` from `@/lib/roles`
- `grade-exams/[examId]/page.tsx` — same
- `grade-exams/new/page.tsx` — same
- `register/page.tsx` — same
- `students/[id]/edit/page.tsx` — same

---

## Task 6: Decompose instructor/page.tsx God Component

### 6.1 Extract StudentSection server component

- Create `/src/app/(dashboard)/instructor/_sections/StudentSection.tsx`
- Async Server Component that receives `{ practitionerId: string; searchQuery: string; page: number }`
- Fetches: academy member IDs, paginated students, active students for cert form
- Renders: search bar, students table, pagination

### 6.2 Extract AcademySection server component

- Create `/src/app/(dashboard)/instructor/_sections/AcademySection.tsx`
- Async Server Component that receives `{ practitionerId: string }`
- Fetches: academies for this instructor
- Renders: academy cards grid

### 6.3 Extract CertificationRequestSection server component

- Create `/src/app/(dashboard)/instructor/_sections/CertificationRequestSection.tsx`
- Async Server Component that receives `{ practitionerId: string; reqPage: number }`
- Fetches: certification requests (paginated)
- Renders: requests table with pagination

### 6.4 Simplify instructor/page.tsx

- Replace all inline data fetching with the three section components
- Page only: auth guard via `requireInstructor()`, parse searchParams, compose sections
- Use `Promise.all` for any remaining parallel fetches

---

## Task 7: Remove direct adminSupabase calls from pages (route through repositories)

### 7.1 Fix grade-exams/page.tsx

- Replace `adminSupabase` calls in `fetchPractitionerNames` with repository calls
- Use `DrizzlePractitionerRepository` and `DrizzleAcademyRepository` instead of raw queries

### 7.2 Fix grade-exams/new/page.tsx

- Replace the 3-step `adminSupabase` chain (academies → memberships → practitioners) with repository calls

### 7.3 Fix grade-exams/[examId]/page.tsx

- Replace `adminSupabase.from("practitioners").select("full_name")` with `DrizzlePractitionerRepository.findById()`

### 7.4 Fix events/page.tsx

- Replace `adminSupabase.from("practitioners")` auth check with `requireInstructor()` helper
- Replace `adminSupabase.from("martial_events")` with an event repository or keep as-is if no event repo exists (document the exception)

---

## Task 8: Fix ExamScoreForm — replace window.confirm with AlertDialog

### 8.1 Replace window.confirm() in ExamScoreForm.tsx

- Add a confirmation state (`showConfirm: boolean`)
- Render a simple inline confirmation UI (or use an existing AlertDialog component from the project)
- Remove `window.confirm()` call

---

## Task 9: Remove dead code

### 9.1 Remove unused AssignPractitionerPanel import

- In `academies/[academyId]/page.tsx`, remove the unused `AssignPractitionerPanel` import

### 9.2 Evaluate ExamDetailView.tsx

- Check if `ExamDetailView` is used anywhere in the admin module
- If unused everywhere: delete the file
- If used in admin: keep it, but remove the duplicate ReadOnlyView from ExamScoreForm and use ExamDetailView instead

---

## Task 10: Fix sequential awaits in instructor/page.tsx

### 10.1 Parallelize independent fetches

- After Task 6 decomposition, ensure each section component uses `Promise.all` for its independent fetches
- In the main page, wrap section data fetches in `Promise.all` where applicable
