import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  InvalidTransitionError,
  NotFoundError,
  ValidationError,
  VersionConflictError,
} from './errors';

// RFC 9457 Problem Details, served as application/problem+json.
function problem(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Content-Type': 'application/problem+json' } });
}

export function toProblemResponse(error: unknown, instance: string): NextResponse {
  if (error instanceof ZodError) {
    return problem(400, {
      type: '/problems/validation-error',
      title: 'Invalid request',
      status: 400,
      detail: 'One or more fields failed validation',
      instance,
      code: 'VALIDATION_ERROR',
      errors: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  if (error instanceof ValidationError) {
    return problem(400, {
      type: '/problems/validation-error',
      title: 'Invalid request',
      status: 400,
      detail: 'One or more fields failed validation',
      instance,
      code: 'VALIDATION_ERROR',
      errors: error.errors,
    });
  }

  if (error instanceof NotFoundError) {
    return problem(404, {
      type: '/problems/not-found',
      title: 'Invoice not found',
      status: 404,
      detail: error.message,
      instance,
      code: 'NOT_FOUND',
    });
  }

  if (error instanceof InvalidTransitionError) {
    return problem(409, {
      type: '/problems/invalid-transition',
      title: 'Status change not allowed',
      status: 409,
      detail: error.message,
      instance,
      code: 'INVALID_TRANSITION',
      currentStatus: error.currentStatus,
      requestedStatus: error.requestedStatus,
      allowed: error.allowed,
    });
  }

  if (error instanceof VersionConflictError) {
    return problem(409, {
      type: '/problems/version-conflict',
      title: 'Changed by someone else',
      status: 409,
      detail: 'This invoice was updated by another reviewer. Reload it and try again.',
      instance,
      code: 'VERSION_CONFLICT',
      expectedVersion: error.expectedVersion,
      currentVersion: error.currentVersion,
    });
  }

  console.error(error);
  return problem(500, {
    type: '/problems/internal-error',
    title: 'Something went wrong',
    status: 500,
    detail: 'An unexpected error occurred',
    instance,
    code: 'INTERNAL_ERROR',
  });
}
