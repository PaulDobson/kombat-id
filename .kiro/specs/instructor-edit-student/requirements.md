# Documento de Requisitos: Instructor Edit Student

## Introducción

Esta funcionalidad permite a un instructor editar los datos no sensibles de un alumno que le pertenece (alumno directo o de su academia). El instructor puede actualizar campos de contacto, físicos y de dirección, pero no puede modificar datos de identidad como RUT, nombre completo, fecha de nacimiento, género, grado, dan ni rol — esos campos son exclusivos del administrador.

La edición se expone a través de una sub-ruta dedicada `/instructor/students/[id]/edit`, siguiendo el patrón establecido en el proyecto. Un botón "Editar alumno" en la página de detalle existente navega a esta sub-ruta.

## Glosario

- **EditStudentPage**: Server Component en `src/app/(dashboard)/instructor/students/[id]/edit/page.tsx` que carga los datos del alumno, verifica pertenencia y renderiza el formulario.
- **EditStudentForm**: Client Component en `src/app/(dashboard)/instructor/students/[id]/edit/EditStudentForm.tsx` que gestiona la interacción del formulario de edición.
- **updateStudentProfile**: Use case en `src/modules/practitioner-identity/application/use-cases/updateStudentProfile.ts` que aplica el patch parcial sobre el perfil del alumno.
- **updateStudentProfileAction**: Server Action en `src/modules/practitioner-identity/presentation/actions/instructorActions.ts` que autentica, autoriza y delega al use case.
- **StudentEditData**: DTO mínimo que contiene solo los 7 campos editables más el `publicId`, sin datos sensibles.
- **UpdateStudentProfileInput**: Schema Zod que define y valida los campos aceptados por el use case.
- **Instructor**: Usuario autenticado con rol `instructor`, `profesor` o `maestro`.
- **Alumno perteneciente**: Practicante que es alumno directo del instructor o alumno de una academia donde el instructor es miembro.
- **Patch parcial**: Semántica de actualización donde los campos `undefined` en el input no modifican el valor existente, y los campos `null` limpian el valor a `null`.
- **ActionResult**: Tipo de retorno tipado `{ success: true; data: T } | { success: false; error: string; code: string }`.
- **PractitionerNotFoundError**: Error de dominio lanzado cuando el practicante no existe en la base de datos.
- **PractitionerInactiveError**: Error de dominio lanzado cuando el practicante existe pero está inactivo.

---

## Requisitos

### Requisito 1: Acceso y autorización a la página de edición

**User Story:** Como instructor, quiero acceder a un formulario de edición para un alumno mío, para poder actualizar sus datos de contacto y físicos de forma segura.

#### Criterios de Aceptación

1. WHEN un instructor autenticado navega a `/instructor/students/[id]/edit`, THE EditStudentPage SHALL cargar los datos actuales del alumno y renderizar el formulario pre-cargado.
2. WHEN el usuario no tiene una sesión activa o no tiene rol de instructor, THE EditStudentPage SHALL redirigir a `/dashboard` sin renderizar el formulario.
3. WHEN el alumno identificado por `[id]` no existe en la base de datos, THE EditStudentPage SHALL retornar una respuesta `not-found`.
4. WHEN el alumno existe pero no pertenece al instructor autenticado (ni como alumno directo ni de su academia), THE EditStudentPage SHALL redirigir a `/instructor` sin renderizar el formulario.
5. THE EditStudentPage SHALL pasar al EditStudentForm únicamente los campos del DTO `StudentEditData` (publicId, weightKg, heightCm, contactPhone, contactEmail, addressStreet, addressCity, addressRegion), excluyendo explícitamente rut, authUserId, qrToken, grade, dan, role y campos de auditoría.

---

### Requisito 2: Use case de actualización con patch parcial

**User Story:** Como sistema, quiero que la lógica de actualización del perfil del alumno aplique un patch parcial semántico, para que solo los campos explícitamente enviados sean modificados.

#### Criterios de Aceptación

1. WHEN el use case `updateStudentProfile` recibe un input con campos `undefined`, THE updateStudentProfile SHALL dejar esos campos con su valor original sin modificación.
2. WHEN el use case `updateStudentProfile` recibe un campo con valor `null`, THE updateStudentProfile SHALL persistir ese campo como `null` en la base de datos.
3. WHEN el use case `updateStudentProfile` recibe un campo con un valor válido, THE updateStudentProfile SHALL persistir ese nuevo valor en la base de datos.
4. THE updateStudentProfile SHALL nunca modificar los campos de identidad rut, fullName, birthDate, gender, grade, dan ni role, independientemente del contenido del input.
5. WHEN la actualización es exitosa, THE updateStudentProfile SHALL renovar el campo `updatedAt` del practicante con la fecha y hora actuales.
6. WHEN el `publicId` no corresponde a ningún practicante, THE updateStudentProfile SHALL lanzar `PractitionerNotFoundError`.
7. WHEN el practicante existe pero tiene `isActive === false`, THE updateStudentProfile SHALL lanzar `PractitionerInactiveError`.

---

### Requisito 3: Server Action con doble verificación de seguridad

**User Story:** Como sistema, quiero que la Server Action verifique autenticación y pertenencia del alumno antes de ejecutar cualquier mutación, para garantizar que ningún instructor pueda editar alumnos ajenos.

#### Criterios de Aceptación

1. THE updateStudentProfileAction SHALL verificar la sesión del usuario mediante `createClient().auth.getUser()` antes de ejecutar cualquier lógica.
2. WHEN el usuario no tiene sesión activa o no tiene rol de instructor/profesor/maestro, THE updateStudentProfileAction SHALL retornar `{ success: false, error: "No autorizado", code: "FORBIDDEN" }`.
3. THE updateStudentProfileAction SHALL validar el input con Zod usando `safeParse` antes de ejecutar cualquier lógica de negocio.
4. WHEN el input no pasa la validación Zod, THE updateStudentProfileAction SHALL retornar `{ success: false, error: "<mensaje de validación>", code: "VALIDATION_ERROR" }`.
5. THE updateStudentProfileAction SHALL verificar que el alumno objetivo pertenece al instructor autenticado (alumno directo o de su academia) antes de ejecutar la mutación.
6. WHEN el alumno no pertenece al instructor autenticado, THE updateStudentProfileAction SHALL retornar `{ success: false, error: "No tienes permiso para editar este alumno", code: "FORBIDDEN" }`.
7. WHEN la mutación es exitosa, THE updateStudentProfileAction SHALL llamar a `revalidatePath` para la página de detalle del alumno y para la página de edición.
8. WHEN la mutación es exitosa, THE updateStudentProfileAction SHALL retornar `{ success: true, data: undefined }`.
9. IF ocurre un error inesperado de base de datos, THEN THE updateStudentProfileAction SHALL loguear el error server-side y retornar `{ success: false, error: "Error interno del servidor", code: "INTERNAL_ERROR" }` sin exponer detalles del error al cliente.
10. THE updateStudentProfileAction SHALL retornar un `ActionResult` tipado en todos los caminos de código, sin lanzar excepciones no manejadas al cliente.

---

### Requisito 4: Formulario de edición interactivo

**User Story:** Como instructor, quiero un formulario pre-cargado con los datos actuales del alumno, para poder modificar solo los campos que necesito y ver el resultado de mis cambios.

#### Criterios de Aceptación

1. THE EditStudentForm SHALL pre-cargar todos los campos editables con los valores actuales del alumno recibidos en el prop `student` de tipo `StudentEditData`.
2. WHEN el instructor modifica campos y envía el formulario, THE EditStudentForm SHALL llamar a `updateStudentProfileAction` dentro de `useTransition` con los valores actuales del formulario.
3. WHILE la acción está en curso (`isPending === true`), THE EditStudentForm SHALL deshabilitar el botón de envío y mostrar un indicador de carga.
4. WHEN la Server Action retorna `{ success: false }`, THE EditStudentForm SHALL mostrar el mensaje de error inline sin perder los valores ingresados en el formulario.
5. WHEN la Server Action retorna `{ success: true }`, THE EditStudentForm SHALL redirigir al instructor a la página de detalle del alumno usando `router.push(backHref)`.
6. THE EditStudentForm SHALL NO recibir ni exponer en su interfaz de props los campos rut, authUserId, qrToken, grade, dan, role ni campos de auditoría.

---

### Requisito 5: Validación de datos de entrada

**User Story:** Como sistema, quiero que todos los campos editables tengan validaciones precisas, para garantizar la integridad de los datos almacenados.

#### Criterios de Aceptación

1. THE UpdateStudentProfileInput SHALL requerir que `publicId` sea un UUID v4 válido.
2. WHEN `weightKg` está presente en el input, THE UpdateStudentProfileInput SHALL validar que sea un número positivo mayor que cero; si no es positivo, SHALL retornar un error de validación.
3. WHEN `heightCm` está presente en el input, THE UpdateStudentProfileInput SHALL validar que sea un entero entre 50 y 250 inclusive; si está fuera de rango, SHALL retornar un error de validación.
4. WHEN `contactEmail` está presente en el input, THE UpdateStudentProfileInput SHALL validar que sea un email válido según formato RFC; si el formato es inválido, SHALL retornar un error de validación.
5. WHEN `contactPhone` está presente en el input, THE UpdateStudentProfileInput SHALL validar que no supere los 30 caracteres.
6. WHEN `addressStreet` está presente en el input, THE UpdateStudentProfileInput SHALL validar que no supere los 200 caracteres.
7. WHEN `addressCity` o `addressRegion` están presentes en el input, THE UpdateStudentProfileInput SHALL validar que no superen los 100 caracteres cada uno.
8. THE UpdateStudentProfileInput SHALL aceptar `null` como valor válido para todos los campos opcionales (weightKg, heightCm, contactPhone, contactEmail, addressStreet, addressCity, addressRegion).
9. THE UpdateStudentProfileInput SHALL aceptar `undefined` como valor válido para todos los campos opcionales, interpretándolo como "no modificar".

---

### Requisito 6: Navegación y punto de entrada

**User Story:** Como instructor, quiero un botón "Editar alumno" en la página de detalle del alumno, para poder acceder fácilmente al formulario de edición.

#### Criterios de Aceptación

1. THE instructor/students/[id]/page.tsx SHALL incluir un elemento `Link` que navegue a `/instructor/students/[id]/edit`.
2. THE Link SHALL estar visible en la página de detalle del alumno para instructores autenticados que sean propietarios del alumno.
3. WHEN el instructor hace clic en el botón "Editar alumno", THE sistema SHALL navegar a la sub-ruta de edición `/instructor/students/[id]/edit`.

---

## Propiedades de Corrección

_Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas._

### Propiedad 1: Verificación de pertenencia del alumno

_Para cualquier_ par (instructor, alumno), la EditStudentPage solo debe renderizar el formulario de edición si y solo si el alumno pertenece al instructor (como alumno directo o de su academia); en cualquier otro caso debe redirigir a `/instructor`.

**Valida: Requisitos 1.4**

### Propiedad 2: Patch semántico — campos no provistos permanecen inalterados

_Para cualquier_ practicante activo y cualquier subconjunto de campos editables (weightKg, heightCm, contactPhone, contactEmail, addressStreet, addressCity, addressRegion), los campos NO incluidos en el input del use case `updateStudentProfile` deben tener exactamente el mismo valor en el practicante guardado que en el practicante original.

**Valida: Requisitos 2.1, 2.2, 2.3**

### Propiedad 3: Inmutabilidad de campos de identidad

_Para cualquier_ input válido de `updateStudentProfile`, los campos rut, fullName, birthDate, gender, grade, dan y role del practicante guardado deben ser idénticos a los del practicante original, independientemente del contenido del input.

**Valida: Requisitos 2.4**

### Propiedad 4: Autorización en la Server Action — solo alumnos propios

_Para cualquier_ instructor autenticado y cualquier alumno, la `updateStudentProfileAction` solo debe ejecutar la mutación si el alumno pertenece al instructor; para cualquier alumno que no pertenezca al instructor, debe retornar `{ success: false, code: "FORBIDDEN" }`.

**Valida: Requisitos 3.5, 3.6**

### Propiedad 5: ActionResult siempre tipado

_Para cualquier_ input (válido, inválido, o malformado), la `updateStudentProfileAction` debe retornar siempre un objeto con la forma `{ success: boolean }` — nunca `undefined`, nunca lanzar una excepción no manejada al cliente.

**Valida: Requisitos 3.10**

### Propiedad 6: Validación rechaza valores fuera de rango

_Para cualquier_ valor de `weightKg` no positivo, `heightCm` fuera del rango [50, 250], o `contactEmail` con formato inválido, el schema `UpdateStudentProfileInput` debe retornar un error de validación y nunca persistir el valor inválido.

**Valida: Requisitos 5.2, 5.3, 5.4**

### Propiedad 7: Pre-carga del formulario con datos actuales

_Para cualquier_ `StudentEditData` válido, el EditStudentForm debe inicializar cada campo del formulario con el valor correspondiente del prop `student`, de modo que el estado inicial del formulario sea igual a los datos actuales del alumno.

**Valida: Requisitos 4.1**
