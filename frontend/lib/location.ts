/** Strip ", United States" suffix from stored location strings for display. */
export function formatLocation(location: string): string {
  return location.replace(/, United States$/, "");
}
