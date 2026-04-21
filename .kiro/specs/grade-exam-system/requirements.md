# Requirements Document

## Introduction

El sistema de exámenes de grado (Grade Exam System) permite a los instructores de la federación Kombat evaluar formalmente a sus alumnos para el cambio de cinturón. El administrador configura pautas de evaluación por transición de grado; el instructor llena la ficha ítem por ítem (online u offline); el sistema calcula automáticamente si el alumno aprueba según un puntaje mínimo configurable; el instructor puede hacer override del resultado con justificación; para grados avanzados el admin debe autorizar antes de que el grado se actualice; y la ficha queda accesible desde el perfil del alumno con el visado de la federación.

## Glossary

- **Platform**: El sistema web de la federación Kombat (Next.js + Supabase).
- **Admin**: Usuario con rol de administrador de la federación.
- **Instructor**: Practicante con rol de instructor, responsable de evaluar alumnos.
- **Practitioner**: Alumno/practicante registrado en la plataforma.
- **ExamTemplate**: Pauta de evaluación configurada por el Admin para una transición de grado específica (fromGrade → toGrade).
- **ExamTemplateItem**: Ítem individual dentro de una ExamTemplate, con nombre y puntaje máximo.
- **GradeExam**: Registro de un examen realizado a un Practitioner por un Instructor.
- **GradeExamItem**: Puntaje asignado por el Instructor a un ExamTemplateItem dentro de un GradeExam.
- **Grade**: Nivel de cinturón (white, yellow, green, blue, red, black).
- **Discipline**: Disciplina marcial (ej: kombat_taekwondo).
- **ExamStatus**: Estado del ciclo de vida de un GradeExam (draft, submitted, pending_authorization, approved, rejected).
- **calculatedResult**: Resultado automático determinado por el sistema según scorePercentage vs minimumPassScore.
- **finalResult**: Resultado efectivo del examen; equivale al overrideResult si hay override activo, o al calculatedResult en caso contrario.
- **scorePercentage**: Porcentaje calculado como (totalScore / maxPossibleScore) × 100.
- **minimumPassScore**: Porcentaje mínimo requerido para que calculatedResult sea "approved", configurable por ExamTemplate.
- **requiresAdminAuth**: Bandera en ExamTemplate que indica si la transición de grado requiere autorización del Admin.
- **InstructorOverride**: Mecanismo por el cual el Instructor puede cambiar el calculatedResult con una justificación obligatoria.
- **Score_Calculator**: Componente de dominio que calcula totalScore, maxPossibleScore, scorePercentage y calculatedResult.
- **Grade_Promotion**: Proceso de actualización del grado del Practitioner tras la aprobación del GradeExam.
- **Exam_Validator**: Componente de dominio que valida reglas de negocio sobre el GradeExam (rangos de puntaje, estado, permisos).

---

## Requirements

### Requirement 1: Configuración de Pautas de Evaluación

**User Story:** Como Admin, quiero configurar pautas de evaluación por transición de grado, para que los instructores tengan criterios claros y estandarizados al evaluar a sus alumnos.

#### Acceptance Criteria

1. WHEN el Admin crea una ExamTemplate, THE Platform SHALL persistir la ExamTemplate con fromGrade, toGrade, discipline, minimumPassScore, requiresAdminAuth y la lista de ExamTemplateItems.
2. THE Platform SHALL garantizar que exista como máximo una ExamTemplate activa por combinación (fromGrade, toGrade, discipline).
3. WHEN el Admin actualiza una ExamTemplate existente, THE Platform SHALL actualizar los campos modificados y registrar updatedAt.
4. WHEN el Admin desactiva una ExamTemplate, THE Platform SHALL marcar isActive = false sin eliminar el registro.
5. THE Admin SHALL poder listar todas las ExamTemplates con su estado (activa/inactiva) y la cantidad de ítems configurados.
6. IF el Admin intenta crear una ExamTemplate con una combinación (fromGrade, toGrade, discipline) que ya tiene una ExamTemplate activa, THEN THE Platform SHALL rechazar la operación con un error de duplicado.
7. WHEN se crea o actualiza una ExamTemplate, THE Exam_Validator SHALL verificar que minimumPassScore esté en el rango [0, 100].
8. WHEN se crea o actualiza una ExamTemplate, THE Exam_Validator SHALL verificar que cada ExamTemplateItem tenga maxScore > 0.

---

### Requirement 2: Inicio de Examen por el Instructor

**User Story:** Como Instructor, quiero iniciar un examen de grado para un alumno, para comenzar el proceso formal de evaluación.

#### Acceptance Criteria

1. WHEN el Instructor inicia un GradeExam para un Practitioner, THE Platform SHALL cargar la ExamTemplate activa correspondiente a la transición (fromGrade → toGrade) y discipline del Practitioner.
2. IF no existe una ExamTemplate activa para la transición solicitada, THEN THE Platform SHALL rechazar la operación con el error ExamTemplateNotFound.
3. IF el Practitioner no está asignado al Instructor autenticado, THEN THE Platform SHALL rechazar la operación con el error UnauthorizedExamCreation (HTTP 403).
4. WHEN se crea el GradeExam, THE Platform SHALL inicializarlo con status = "draft", con un GradeExamItem por cada ExamTemplateItem de la plantilla (score = 0) y registrar examDate, instructorId y practitionerId.
5. THE Platform SHALL permitir que el Instructor guarde el GradeExam en estado "draft" para continuar la evaluación en otro momento.

---

### Requirement 3: Ingreso de Puntajes y Cálculo Automático

**User Story:** Como Instructor, quiero ingresar los puntajes por ítem y que el sistema calcule automáticamente el resultado, para obtener una evaluación objetiva y consistente.

#### Acceptance Criteria

1. WHEN el Instructor ingresa un score para un GradeExamItem, THE Exam_Validator SHALL verificar que el score esté en el rango [0, maxScore] del ítem correspondiente.
2. IF el Instructor ingresa un score fuera del rango [0, maxScore], THEN THE Platform SHALL rechazar el valor con un error de validación por ítem específico.
3. WHEN el Instructor envía los puntajes del GradeExam, THE Score_Calculator SHALL calcular totalScore como la suma de todos los GradeExamItem.score.
4. WHEN el Instructor envía los puntajes del GradeExam, THE Score_Calculator SHALL calcular maxPossibleScore como la suma de todos los GradeExamItem.maxScore.
5. WHEN el Instructor envía los puntajes del GradeExam, THE Score_Calculator SHALL calcular scorePercentage = (totalScore / maxPossibleScore) × 100.
6. WHEN scorePercentage >= minimumPassScore de la ExamTemplate, THE Score_Calculator SHALL asignar calculatedResult = "approved".
7. WHEN scorePercentage < minimumPassScore de la ExamTemplate, THE Score_Calculator SHALL asignar calculatedResult = "failed".
8. THE Platform SHALL mostrar al Instructor el resultado calculado (calculatedResult) junto con el scorePercentage antes de que el examen sea enviado definitivamente.

---

### Requirement 4: Override del Resultado por el Instructor

**User Story:** Como Instructor, quiero poder modificar el resultado calculado con una justificación, para reflejar circunstancias excepcionales que el puntaje numérico no captura.

#### Acceptance Criteria

1. WHEN el Instructor activa el InstructorOverride en un GradeExam con status "draft", THE Platform SHALL requerir que overrideJustification sea una cadena no vacía.
2. IF el Instructor activa el InstructorOverride sin proporcionar overrideJustification, THEN THE Platform SHALL rechazar la operación con un error de campo requerido.
3. WHEN el InstructorOverride está activo y overrideResult está definido, THE Score_Calculator SHALL asignar finalResult = overrideResult.
4. WHEN el InstructorOverride está inactivo, THE Score_Calculator SHALL asignar finalResult = calculatedResult.
5. THE Platform SHALL registrar instructorOverride = true, overrideResult y overrideJustification en el GradeExam cuando se aplique el override.

---

### Requirement 5: Envío del Examen y Transición de Estado

**User Story:** Como Instructor, quiero enviar el examen completado, para que el sistema procese el resultado y actualice el grado del alumno o lo envíe a autorización.

#### Acceptance Criteria

1. WHEN el Instructor envía un GradeExam con status "draft", THE Platform SHALL transicionar el status según requiresAdminAuth de la ExamTemplate.
2. WHEN requiresAdminAuth = false y finalResult = "approved", THE Platform SHALL transicionar el GradeExam a status = "approved" y ejecutar Grade_Promotion.
3. WHEN requiresAdminAuth = false y finalResult = "failed", THE Platform SHALL transicionar el GradeExam a status = "submitted" sin ejecutar Grade_Promotion.
4. WHEN requiresAdminAuth = true, THE Platform SHALL transicionar el GradeExam a status = "pending_authorization" independientemente del finalResult.
5. IF el Instructor intenta modificar un GradeExam con status "approved" o "rejected", THEN THE Platform SHALL rechazar la operación con el error ExamAlreadyFinalized.
6. THE Platform SHALL notificar al Instructor cuando el GradeExam sea aprobado o rechazado.

---

### Requirement 6: Autorización del Examen por el Admin

**User Story:** Como Admin, quiero revisar y autorizar o rechazar exámenes de grados avanzados, para mantener el control de calidad en las promociones de grado de la federación.

#### Acceptance Criteria

1. THE Admin SHALL poder listar todos los GradeExams con status = "pending_authorization".
2. WHEN el Admin autoriza un GradeExam con status "pending_authorization", THE Platform SHALL transicionar el status a "approved", registrar authorizedBy y authorizedAt, y ejecutar Grade_Promotion.
3. WHEN el Admin rechaza un GradeExam con status "pending_authorization", THE Platform SHALL transicionar el status a "rejected" y registrar rejectedBy y rejectionReason.
4. IF el Admin intenta autorizar o rechazar un GradeExam que no tiene status "pending_authorization", THEN THE Platform SHALL rechazar la operación con el error ExamAlreadyFinalized.
5. WHEN el Admin rechaza un GradeExam, THE Platform SHALL requerir que rejectionReason sea una cadena no vacía.
6. IF el Admin rechaza un GradeExam sin proporcionar rejectionReason, THEN THE Platform SHALL rechazar la operación con un error de campo requerido.

---

### Requirement 7: Promoción de Grado (Grade Promotion)

**User Story:** Como sistema, quiero actualizar automáticamente el grado del alumno cuando un examen es aprobado, para mantener el registro oficial de grados actualizado.

#### Acceptance Criteria

1. WHEN un GradeExam transiciona a status = "approved", THE Grade_Promotion SHALL actualizar practitioners.grade al toGrade del GradeExam.
2. WHEN un GradeExam transiciona a status = "approved", THE Grade_Promotion SHALL crear una entrada en martial_history con type = "exam" referenciando el GradeExam.
3. THE Grade_Promotion SHALL ejecutarse únicamente desde el use case applyGradePromotion, nunca directamente desde la capa de presentación.
4. IF la actualización de practitioners.grade falla, THEN THE Grade_Promotion SHALL revertir el status del GradeExam y registrar el error.

---

### Requirement 8: Acceso a la Ficha de Examen

**User Story:** Como Practitioner, quiero ver mis fichas de examen desde mi perfil, para tener acceso al historial oficial de mis evaluaciones con el visado de la federación.

#### Acceptance Criteria

1. THE Platform SHALL mostrar en el perfil del Practitioner la lista de sus GradeExams con status, fecha, grado evaluado y finalResult.
2. WHEN el Practitioner accede al detalle de un GradeExam, THE Platform SHALL mostrar todos los GradeExamItems con sus puntajes, el scorePercentage, el calculatedResult y, si aplica, el overrideJustification y la información de autorización del Admin.
3. THE Platform SHALL restringir el acceso a los GradeExams de un Practitioner únicamente al propio Practitioner, a su Instructor y a los Admins.
4. WHILE un GradeExam tiene status = "approved", THE Platform SHALL mostrar el visado de la federación (authorizedBy o indicador de aprobación automática) en la ficha.

---

### Requirement 9: Impresión de Pauta (Offline)

**User Story:** Como Instructor, quiero imprimir la ficha de evaluación, para poder realizar el examen en papel cuando no hay conectividad.

#### Acceptance Criteria

1. WHEN el Instructor solicita imprimir un GradeExam o una ExamTemplate, THE Platform SHALL generar una vista imprimible con todos los ítems, puntajes máximos y espacio para anotar puntajes.
2. THE Platform SHALL generar la vista imprimible sin requerir procesamiento en el servidor (client-side rendering con CSS @media print).

---

### Requirement 10: Seguridad y Control de Acceso

**User Story:** Como federación, quiero que el sistema aplique controles de acceso estrictos, para garantizar la integridad de los registros de evaluación.

#### Acceptance Criteria

1. THE Platform SHALL verificar en cada Server Action de Instructor que el practitionerId del GradeExam pertenezca al instructorId autenticado antes de crear o modificar el examen.
2. THE Platform SHALL restringir las operaciones configureExamTemplate, authorizeExam y rejectExam exclusivamente a usuarios con rol Admin.
3. WHILE un Instructor accede a la lista de GradeExams, THE Platform SHALL mostrar únicamente los GradeExams creados por ese Instructor.
4. THE Platform SHALL aplicar Row Level Security (RLS) en Supabase para que los Instructors solo lean sus propios GradeExams, los Practitioners solo lean sus propias fichas, y los Admins lean todos los registros.
