export type AttendanceSummary = {
  present: number; late: number; absent: number; excused: number;
  marked: number; total: number; unmarked: number; rate: number | null;
};

export const isAttendanceAttention = (status?: string | null) => ['absent', 'late', 'excused'].includes(status || '');

export function summarizeAttendance(rows: { status?: string | null }[]): AttendanceSummary {
  let present = 0, late = 0, absent = 0, excused = 0;
  for (const row of rows) {
    if (row.status === 'present') present++;
    else if (row.status === 'late') late++;
    else if (row.status === 'absent') absent++;
    else if (row.status === 'excused') excused++;
  }
  const marked = present + late + absent + excused;
  return { present, late, absent, excused, marked, total: rows.length, unmarked: rows.length - marked,
    rate: marked ? Math.round((present + late) / marked * 1000) / 10 : null };
}
