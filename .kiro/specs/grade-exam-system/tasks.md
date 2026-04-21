# Tasks: Grade Exam System

## Task List

- [x] 1. Migración de base de datos
  - [x] 1.1 Crear `src/lib/db/migrations/029_add_grade_exam_system.sql` con las tablas `exam_templates`, `exam_template_items`, `grade_exams` y `grade_exam_items` según el esquema SQL del diseño; incluir índices en `grade_exams(status)`, `grade_exams(instructor_id)` y `grade_exams(practitioner_id)`
    - _Requirements: 1.1, 1.2, 2.4, 3.3_

- [x] 2. Capa de dominio — entidades e interfaces
  - [x] 2.1 Crear `src/modules/grade-exam/domain/entities/examTemplate.ts` con los tipos `ExamTemplate`, `ExamTemplateItem`, `Grade`, `Discipline` y las funciones puras `validateMinimumPassScore` y `validateItemMaxScore`
    - _Requirements: 1.7, 1.8_
  - [x] 2.2 Crear `src/modules/grade-exam/domain/entities/gradeExam.ts` con los tipos `GradeExam`, `GradeExamItem`, `ExamStatus`, `calculateExamScore` (retorna `totalScore`, `maxPossibleScore`, `scorePercentage`, `calculatedResult`) y `determineFinalResult`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 4.3, 4.4_
  - [ ]\* 2.3 Escribir property tests para `calculateExamScore` y `determineFinalResult` con fast-check
    - **Property 1: scorePercentage siempre en rango [0, 100]** — para cualquier conjunto de ítems con scores en [0, maxScore]
    - **Validates: Requirements 3.5**
    - **Property 2: calculatedResult determinado por scorePercentage vs minimumPassScore**
    - **Validates: Requirements 3.6, 3.7**
    - **Property 3: finalResult determinado por override**
    - **Validates: Requirements 4.3, 4.4**
    - **Property 4: totalScore y maxPossibleScore son sumas exactas**
    - **Validates: Requirements 3.3, 3.4**
  - [x] 2.4 Crear `src/modules/grade-exam/domain/entities/gradeExam.ts` — agregar `validateExamTransition` que verifica que el status actual permita la transición solicitada y lanza `ExamAlreadyFinalized` si el examen está en estado terminal
    - _Requirements: 5.5, 6.4_
  - [x] 2.5 Crear `src/modules/grade-exam/domain/interfaces/examTemplateRepository.ts` con la interfaz `IExamTemplateRepository` (findById, findByGradeTransition, findAll, save, update)
    - _Requirements: 1.1, 1.5_
  - [x] 2.6 Crear `src/modules/grade-exam/domain/interfaces/gradeExamRepository.ts` con la interfaz `IGradeExamRepository` (findById, findByPractitioner, findByInstructor, findPendingAuthorization, save, update)
    - _Requirements: 6.1, 10.3_

- [x] 3. Capa de infraestructura — repositorios Drizzle
  - [x] 3.1 Crear `src/modules/grade-exam/infrastructure/repositories/drizzleExamTemplateRepository.ts` implementando `IExamTemplateRepository` con Drizzle ORM; `findByGradeTransition` filtra por `is_active = true`; `save` inserta template e ítems en una transacción
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]\* 3.2 Escribir property test para unicidad de ExamTemplate activa por transición
    - **Property 5: Unicidad de ExamTemplate activa por transición** — no puede existir más de una ExamTemplate activa para (fromGrade, toGrade, discipline)
    - **Validates: Requirements 1.2, 1.6**
  - [x] 3.3 Crear `src/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository.ts` implementando `IGradeExamRepository`; `findByInstructor` filtra por `instructor_id`; `findPendingAuthorization` filtra por `status = 'pending_authorization'`; todas las queries cargan ítems con JOIN para evitar N+1
    - _Requirements: 6.1, 10.3, 10.4_
  - [ ]\* 3.4 Escribir property tests para los repositorios Drizzle
    - **Property 11: Filtrado correcto de exámenes pendientes de autorización** — el listado contiene exactamente los GradeExams con status = "pending_authorization"
    - **Validates: Requirements 6.1**
    - **Property 12: Aislamiento de datos por Instructor** — el listado de un instructor contiene únicamente sus propios GradeExams
    - **Validates: Requirements 10.3**

- [x] 4. Capa de aplicación — use cases
  - [x] 4.1 Crear `src/modules/grade-exam/application/use-cases/configureExamTemplate.ts`: valida unicidad de transición activa, valida `minimumPassScore` en [0,100] y `maxScore > 0` por ítem, persiste via `IExamTemplateRepository`
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8_
  - [x] 4.2 Crear `src/modules/grade-exam/application/use-cases/startExam.ts`: verifica que el practitioner pertenezca al instructor autenticado (lanza `UnauthorizedExamCreation`), carga `ExamTemplate` activa (lanza `ExamTemplateNotFound` si no existe), inicializa `GradeExam` con status `"draft"` y N `GradeExamItems` con score = 0
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]\* 4.3 Escribir property test para inicialización correcta del GradeExam
    - **Property 6: Inicialización correcta del GradeExam** — el GradeExam creado tiene exactamente N GradeExamItems con score = 0, status = "draft", y los campos instructorId, practitionerId y examDate registrados
    - **Validates: Requirements 2.1, 2.4**
  - [x] 4.4 Crear `src/modules/grade-exam/application/use-cases/submitExamScores.ts`: valida que cada score esté en [0, maxScore] (lanza error por ítem específico), llama `calculateExamScore` y `determineFinalResult`, persiste scores y resultado calculado; el examen permanece en `"draft"` hasta el envío definitivo
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [ ]\* 4.5 Escribir property test para validación de rango de scores por ítem
    - **Property 7: Validación de rango de scores por ítem** — cualquier score en [0, maxScore] es aceptado; cualquier score fuera de ese rango es rechazado
    - **Validates: Requirements 3.1, 3.2**
  - [x] 4.6 Crear `src/modules/grade-exam/application/use-cases/overrideExamResult.ts`: requiere `overrideJustification` no vacía (lanza error de campo requerido si está vacía o solo espacios), actualiza `instructorOverride`, `overrideResult`, `overrideJustification` y recalcula `finalResult`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]\* 4.7 Escribir property test para override con justificación
    - **Property 14: Override requiere justificación no vacía** — si overrideJustification es vacía o solo espacios, la operación es rechazada
    - **Validates: Requirements 4.1, 4.2**
  - [x] 4.8 Crear `src/modules/grade-exam/application/use-cases/applyGradePromotion.ts`: actualiza `practitioners.grade = toGrade` y crea entrada en `martial_history` con `type = "exam"`; si la actualización falla, revierte el status del GradeExam; solo se invoca desde otros use cases, nunca desde la presentación
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]\* 4.9 Escribir property test para Grade Promotion
    - **Property 10: Grade Promotion actualiza grado y crea historial** — tras status = "approved", practitioners.grade = toGrade y existe exactamente una entrada en martial_history con type = "exam"
    - **Validates: Requirements 7.1, 7.2**
  - [x] 4.10 Crear `src/modules/grade-exam/application/use-cases/authorizeExam.ts`: verifica que el examen esté en `"pending_authorization"` (lanza `ExamAlreadyFinalized` si no), transiciona a `"approved"`, registra `authorizedBy` y `authorizedAt`, llama `applyGradePromotion`
    - _Requirements: 6.2, 6.4_
  - [x] 4.11 Crear `src/modules/grade-exam/application/use-cases/rejectExam.ts`: verifica que el examen esté en `"pending_authorization"` (lanza `ExamAlreadyFinalized` si no), requiere `rejectionReason` no vacía, transiciona a `"rejected"`, registra `rejectedBy` y `rejectionReason`
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - [ ]\* 4.12 Escribir property tests para transición de estado y estados terminales
    - **Property 8: Transición de estado correcta al enviar examen** — según requiresAdminAuth y finalResult, el status resultante es el correcto
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - **Property 9: Inmutabilidad de estados terminales** — cualquier intento de modificar un examen "approved" o "rejected" lanza ExamAlreadyFinalized
    - **Validates: Requirements 5.5, 6.4**
    - **Property 15: Rechazo de examen requiere motivo no vacío**
    - **Validates: Requirements 6.5, 6.6**

- [x] 5. Checkpoint — Asegurar que todos los tests pasen
  - Ejecutar la suite de tests; resolver cualquier fallo antes de continuar con la capa de presentación.

- [x] 6. Server Actions — Admin
  - [x] 6.1 Crear `src/modules/grade-exam/presentation/actions/adminExamActions.ts` con los schemas Zod y las actions: `createExamTemplateAction` (requiere admin, llama `configureExamTemplate`), `updateExamTemplateAction`, `deactivateExamTemplateAction`, `authorizeExamAction` (requiere admin, llama `authorizeExam`), `rejectExamAction` (requiere admin, llama `rejectExam`); cada action llama `revalidatePath` al finalizar
    - _Requirements: 1.1, 1.3, 1.4, 1.6, 6.2, 6.3, 10.2_
  - [ ]\* 6.2 Escribir property test para control de acceso de operaciones Admin
    - **Property 13: Control de acceso basado en rol para operaciones de Admin** — usuarios sin rol Admin reciben error de autorización al llamar configureExamTemplate, authorizeExam o rejectExam
    - **Validates: Requirements 10.2**

- [x] 7. Server Actions — Instructor
  - [x] 7.1 Crear `src/modules/grade-exam/presentation/actions/instructorExamActions.ts` con los schemas Zod y las actions: `startExamAction` (verifica ownership del practitioner, llama `startExam`), `saveExamDraftAction` (guarda puntajes sin enviar), `submitExamAction` (llama `submitExamScores` + transiciona estado según `requiresAdminAuth`), `overrideExamResultAction` (llama `overrideExamResult`); cada action llama `revalidatePath`
    - _Requirements: 2.1, 2.3, 2.5, 3.1, 3.8, 4.1, 5.1, 5.2, 5.3, 5.4, 10.1_

- [x] 8. Páginas Admin — Configuración de pautas
  - [x] 8.1 Crear `src/app/(dashboard)/admin/exam-templates/page.tsx`: lista todas las `ExamTemplates` con columnas Transición, Disciplina, Puntaje mínimo, Requiere auth, Estado (activa/inactiva), N° ítems; botón "Nueva pauta"
    - _Requirements: 1.5_
  - [x] 8.2 Crear `src/app/(dashboard)/admin/exam-templates/new/page.tsx` con formulario para crear `ExamTemplate`: campos fromGrade, toGrade, discipline, minimumPassScore, requiresAdminAuth y lista dinámica de ítems (nombre, descripción, maxScore, orden); llama `createExamTemplateAction`
    - _Requirements: 1.1, 1.7, 1.8_
  - [x] 8.3 Crear `src/app/(dashboard)/admin/exam-templates/[templateId]/page.tsx`: detalle de la pauta con sus ítems; botones "Editar" y "Desactivar"
    - _Requirements: 1.3, 1.4_
  - [x] 8.4 Crear `src/app/(dashboard)/admin/exam-templates/[templateId]/edit/page.tsx` con formulario de edición que pre-carga los datos actuales y llama `updateExamTemplateAction`
    - _Requirements: 1.3_

- [x] 9. Páginas Admin — Bandeja de autorización
  - [x] 9.1 Crear `src/app/(dashboard)/admin/grade-exams/page.tsx`: lista los `GradeExams` con `status = "pending_authorization"` con columnas Alumno, Instructor, Transición, Fecha, Puntaje %; botón "Ver detalle" por fila
    - _Requirements: 6.1_
  - [x] 9.2 Crear `src/app/(dashboard)/admin/grade-exams/[examId]/page.tsx`: detalle completo del examen (ítems con puntajes, scorePercentage, calculatedResult, override si aplica); botones "Autorizar" y "Rechazar" con modal de confirmación para rechazar que requiere `rejectionReason`; llaman `authorizeExamAction` y `rejectExamAction`
    - _Requirements: 6.2, 6.3, 6.5, 6.6_

- [x] 10. Páginas Instructor — Gestión de exámenes
  - [x] 10.1 Crear `src/app/(dashboard)/instructor/grade-exams/page.tsx`: lista los `GradeExams` del instructor autenticado con columnas Alumno, Transición, Fecha, Estado, Resultado; botón "Nuevo examen"; paginación
    - _Requirements: 10.3_
  - [x] 10.2 Crear `src/app/(dashboard)/instructor/grade-exams/new/page.tsx`: formulario para iniciar examen — selector de alumno (solo alumnos del instructor), selector de grado objetivo, fecha; llama `startExamAction` y redirige al detalle del examen creado
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 10.3 Crear `src/app/(dashboard)/instructor/grade-exams/[examId]/page.tsx`: formulario de ingreso de puntajes por ítem con validación en tiempo real (score en [0, maxScore]); muestra `scorePercentage` y `calculatedResult` calculados en cliente; sección de override con campo `overrideJustification`; botones "Guardar borrador" y "Enviar examen"; vista de solo lectura cuando el examen ya no está en `"draft"`; botón "Imprimir" que activa `@media print`
    - _Requirements: 3.1, 3.2, 3.8, 4.1, 4.2, 5.1, 5.5, 9.1, 9.2_

- [x] 11. Integración en perfil del alumno — ficha de examen
  - [x] 11.1 Actualizar `src/app/(dashboard)/instructor/students/[id]/page.tsx` para mostrar la sección "Exámenes de grado": lista de `GradeExams` del alumno con estado, fecha y resultado; enlace "Iniciar nuevo examen" que pre-selecciona al alumno en el formulario de nuevo examen
    - _Requirements: 8.1, 8.3_
  - [x] 11.2 Actualizar `src/app/(dashboard)/profile/[publicId]/page.tsx` para mostrar la sección "Fichas de examen": lista de `GradeExams` del practicante con estado, fecha, transición y finalResult; enlace al detalle de cada examen
    - _Requirements: 8.1, 8.3_
  - [x] 11.3 Crear componente `src/app/(dashboard)/instructor/grade-exams/[examId]/ExamDetailView.tsx` reutilizable para mostrar el detalle completo de un examen (ítems, puntajes, scorePercentage, calculatedResult, override, visado de federación cuando `status = "approved"`); usado tanto en la vista del instructor como en la del alumno y admin
    - _Requirements: 8.2, 8.4_
  - [ ]\* 11.4 Escribir property test para acceso a ficha de examen
    - **Property 16: Acceso a ficha de examen restringido por rol** — usuarios que no son el Practitioner evaluado, su Instructor ni un Admin reciben error de acceso denegado
    - **Validates: Requirements 8.3**

- [x] 12. Checkpoint final — Asegurar que todos los tests pasen
  - Ejecutar la suite completa de tests; verificar que las páginas renderizan correctamente; resolver cualquier fallo antes de dar por completada la implementación.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos específicos para trazabilidad.
- Los property tests usan fast-check y validan las propiedades de corrección definidas en el diseño.
- La actualización de `practitioners.grade` ocurre únicamente desde `applyGradePromotion`, nunca desde la UI directamente.
- La impresión de pauta se implementa con CSS `@media print` sin dependencias adicionales.
