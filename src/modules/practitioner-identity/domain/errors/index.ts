import { DomainError } from "@/lib/errors";

export class PractitionerNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Practitioner not found: ${id}`);
  }
}

export class DuplicateRutError extends DomainError {
  constructor(rut: string) {
    super(`A practitioner with RUT ${rut} already exists`);
  }
}

export class PractitionerInactiveError extends DomainError {
  constructor(id: string) {
    super(`Practitioner ${id} is inactive`);
  }
}

export class DuplicateHistoryEntryError extends DomainError {
  constructor(practitionerId: string, eventId: string) {
    super(
      `A history entry for practitioner ${practitionerId} and event ${eventId} already exists`,
    );
  }
}

export class CertificationNotFoundError extends DomainError {
  constructor(certId: string) {
    super(`Certification not found: ${certId}`);
  }
}

export class CertificationAlreadyRevokedError extends DomainError {
  constructor(certId: string) {
    super(`Certification ${certId} has already been revoked`);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "You are not authorized to perform this action") {
    super(message);
  }
}

export class InvalidGradeDowngradeError extends DomainError {
  constructor() {
    super(
      "Downgrading a practitioner's grade requires an explicit justification",
    );
  }
}

export class AcademyNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Academy not found: ${id}`);
  }
}

export class AcademyInactiveError extends DomainError {
  constructor(id: string) {
    super(`Academy ${id} is inactive`);
  }
}

export class AcademyAlreadyDeactivatedError extends DomainError {
  constructor(id: string) {
    super(`Academy ${id} is already deactivated`);
  }
}

export class PractitionerAlreadyInAcademyError extends DomainError {
  constructor(practitionerId: string) {
    super(
      `Practitioner ${practitionerId} already has an active academy membership`,
    );
  }
}

export class MembershipNotFoundError extends DomainError {
  constructor(practitionerId: string) {
    super(`No active membership found for practitioner ${practitionerId}`);
  }
}

export class InvalidInstructorRoleError extends DomainError {
  constructor(practitionerId: string) {
    super(
      `Practitioner ${practitionerId} does not have the required role (instructor, profesor, or maestro) to be a responsible instructor`,
    );
  }
}
