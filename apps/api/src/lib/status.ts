export function calculateStatus(
  currentStock: number,
  maxLevel: number | null | undefined,
): string {
  if (!maxLevel || maxLevel <= 0) {
    return currentStock > 0 ? "In Stock" : "Action Required";
  }

  const percentage = (currentStock / maxLevel) * 100;

  if (percentage < 50) {
    return "Action Required";
  }
  if (percentage < 70) {
    return "Low";
  }
  return "In Stock";
}
