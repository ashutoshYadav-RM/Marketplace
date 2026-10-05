/** `412m` under a kilometre, `1.2km` above — matches how the brief's search mockups show distance. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
