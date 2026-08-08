import { Prisma } from "@repo/database";

export class ValidationError extends Error {}

export class OperationError extends Error {}

export function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
