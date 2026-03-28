/**
 * Count the number of budget weeks for a given month.
 * A week (Monday→Sunday) belongs to a month if it has >= 4 days in that month.
 * This better reflects real spending patterns between pay periods.
 */
export function getWeeksInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month - 1, daysInMonth);

  // Find the Monday on or before the 1st of the month
  let monday = new Date(firstDay);
  const dow = monday.getDay(); // 0=Sun, 1=Mon, ...
  const offset = dow === 0 ? 6 : dow - 1; // days since last Monday
  monday.setDate(monday.getDate() - offset);

  let count = 0;

  // Iterate through each Monday→Sunday week that overlaps with the month
  while (monday <= lastDay) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    // Count how many days of this week fall within the month
    const weekStart = monday < firstDay ? firstDay : monday;
    const weekEnd = sunday > lastDay ? lastDay : sunday;
    const daysInThisMonth = Math.round((weekEnd.getTime() - weekStart.getTime()) / 86400000) + 1;

    if (daysInThisMonth >= 4) {
      count++;
    }

    // Move to next Monday
    monday.setDate(monday.getDate() + 7);
  }

  return count;
}

/**
 * Get the French label for a month.
 */
const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}
