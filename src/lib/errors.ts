import type { InvoiceStatus } from './status';

export class NotFoundError extends Error {
  constructor(message = 'Invoice not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(
    public currentStatus: InvoiceStatus,
    public requestedStatus: InvoiceStatus,
    public allowed: InvoiceStatus[],
  ) {
    super(`Invoice is already ${currentStatus} and cannot be changed to ${requestedStatus}`);
    this.name = 'InvalidTransitionError';
  }
}

export class VersionConflictError extends Error {
  constructor(
    public expectedVersion: number,
    public currentVersion: number,
  ) {
    super('Invoice was changed by someone else');
    this.name = 'VersionConflictError';
  }
}

export class ValidationError extends Error {
  constructor(public errors: { path: string; message: string }[]) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}
