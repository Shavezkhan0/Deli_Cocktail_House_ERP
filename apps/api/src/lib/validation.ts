import { ValidationError } from "./errors";

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseOptionalString(
  value: unknown,
  fieldLabel: string,
  invalidMessage = "must be a valid string",
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldLabel} ${invalidMessage}`);
  }
  return value.trim();
}

export function toNonNegativeInt(
  value: unknown,
  fallback: number,
): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

export function toNonNegativeFloat(
  value: unknown,
  fallback: number,
): number | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}
