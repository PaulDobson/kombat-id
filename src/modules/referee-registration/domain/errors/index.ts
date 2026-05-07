import { DomainError } from "@/lib/errors";

export class RefereeRegistrationNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Referee registration not found: ${id}`);
  }
}

export class DuplicateRefereeEmailError extends DomainError {
  constructor(email: string) {
    super(`A referee registration with email "${email}" already exists`);
  }
}

export class DuplicateRegistrationNumberError extends DomainError {
  constructor(registrationNumber: string) {
    super(
      `A referee registration with number "${registrationNumber}" already exists`,
    );
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(current: string, next: string) {
    super(
      `Cannot transition referee registration from "${current}" to "${next}"`,
    );
  }
}

export class PortalPublicationNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Portal publication not found: ${id}`);
  }
}

export class AuthUserCreationError extends DomainError {
  constructor(email: string, reason: string) {
    super(`Failed to create auth user for "${email}": ${reason}`);
  }
}

export class AlreadyRegisteredForEventError extends DomainError {
  constructor(publicationId: string, refereeUserId: string) {
    super(
      `Referee "${refereeUserId}" is already registered for event "${publicationId}"`,
    );
  }
}

export class EventAtCapacityError extends DomainError {
  constructor(publicationId: string) {
    super(
      `Event "${publicationId}" has reached its maximum number of participants`,
    );
  }
}

export class RegistrationDeadlinePassedError extends DomainError {
  constructor(publicationId: string) {
    super(`The registration deadline for event "${publicationId}" has passed`);
  }
}

export class RefereeEventRegistrationNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Referee event registration not found: ${id}`);
  }
}

export class NotAnEventError extends DomainError {
  constructor(publicationId: string) {
    super(`Publication "${publicationId}" is not an event`);
  }
}

export class StorageUploadError extends DomainError {
  constructor(path: string, reason: string) {
    super(`Failed to upload file to Storage at "${path}": ${reason}`);
  }
}
