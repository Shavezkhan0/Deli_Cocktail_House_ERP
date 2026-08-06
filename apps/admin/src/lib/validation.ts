import type { z } from "zod";

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}
