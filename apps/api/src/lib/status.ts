export function calculateStatus(
  currentStock: number,
  openingStock: number,
): string {
  if (openingStock <= 0) {
    return currentStock > 0 ? "In Stock" : "Action Required";
  }

  const percentage = (currentStock / openingStock) * 100;

  if (percentage < 20) {
    return "Action Required";
  }
  if (percentage < 50) {
    return "Low";
  }
  return "In Stock";
}
