/**
 * Count the number of Mondays in a given month.
 * This determines the number of "weeks" for budget calculations.
 */
export function getWeeksInMonth(year: number, month: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based here

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day); // month is 0-based for Date constructor
    if (date.getDay() === 1) {
      count++;
    }
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
