// Formats a Date as a local (not UTC) YYYY-MM-DD string — used for workout
// dates and body-measurement snapshots so "today" always matches the user's
// wall clock instead of shifting a day near midnight in UTC-behind zones.
export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Days between two YYYY-MM-DD dates (b - a), used by the recovery engine to
// decide whether a muscle group was trained "yesterday" vs. days ago.
export function daysBetween(a: string, b: string): number {
  const msA = new Date(`${a}T00:00:00Z`).getTime();
  const msB = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((msB - msA) / 86_400_000);
}

export function startOfWeekStr(d: Date = new Date()): string {
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return toLocalDateStr(monday);
}
