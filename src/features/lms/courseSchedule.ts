// Dates are calendar days, independent of the browser's time zone.
export function courseSchedulePreview(start: string, days: number[], total: number) {
  const cursor = new Date(`${start}T00:00:00Z`);
  if (!Number.isFinite(cursor.getTime()) || cursor.toISOString().slice(0, 10) !== start
    || !Number.isInteger(total) || total < 1 || total > 10000
    || !Array.isArray(days) || !days.length || new Set(days).size !== days.length
    || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return null;
  let count = 0, firstDate = '';
  while (count < total) {
    if (days.includes(cursor.getUTCDay())) {
      if (!count) firstDate = cursor.toISOString().slice(0, 10);
      count++;
      if (count === total) return { firstDate, endDate: cursor.toISOString().slice(0, 10) };
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return null;
}
