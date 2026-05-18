import { DomainError } from "@/lib/errors";

export class InstructorAccountRequestNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Instructor account request not found: ${id}`);
  }
}

export class DuplicateInstructorEmailError extends DomainError {
  constructor(email: string) {
    super(`An instructor account request with email "${email}" already exists`);
  }
}

export class InvalidInstructorStatusTransitionError extends DomainError {
  constructor(current: string, next: string) {
    super(
      `Cannot transition instructor account request from "${current}" to "${next}"`,
    );
  }
}

export class InstructorAuthUserCreationError extends DomainError {
  constructor(email: string, reason: string) {
    super(`Failed to create auth user for instructor "${email}": ${reason}`);
  }
}
