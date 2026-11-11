/** Erreurs métier traduites en messages utilisateur par les actions. */
export class NotFoundError extends Error {
  constructor(message = 'Élément introuvable.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export function isUserFacingError(error: unknown): error is NotFoundError | BusinessRuleError | PlanLimitError {
  return error instanceof NotFoundError || error instanceof BusinessRuleError || error instanceof PlanLimitError;
}
