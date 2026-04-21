export class EventAtCapacityError extends Error {
  constructor() {
    super("El evento ha alcanzado el aforo máximo");
    this.name = "EventAtCapacityError";
  }
}

export class AlreadyRegisteredError extends Error {
  constructor(public readonly practitionerName: string) {
    super(`El alumno ${practitionerName} ya está inscrito en este evento`);
    this.name = "AlreadyRegisteredError";
  }
}

export class RegistrationAlreadyConfirmedError extends Error {
  constructor() {
    super("Esta inscripción ya está confirmada");
    this.name = "RegistrationAlreadyConfirmedError";
  }
}

export class RegistrationNotFoundError extends Error {
  constructor() {
    super("Inscripción no encontrada");
    this.name = "RegistrationNotFoundError";
  }
}
