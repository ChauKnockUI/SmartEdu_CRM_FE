import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const attendanceService = {
  // GET session attendance with student list
  getSessionAttendance: async (scheduleId: number) => {
    const res = await fetch(`${config.baseURL}/attendance/sessions/${scheduleId}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json;
  },

  // GET absence list for a session
  getAbsenceList: async (scheduleId: number) => {
    const res = await fetch(`${config.baseURL}/attendance/sessions/${scheduleId}/absences`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json;
  },

  // MARK attendance for a session
  markAttendance: async (
    scheduleId: number,
    payload: {
      lessonContent: string;
      attendances: {
        student_id: number;
        status: 'present' | 'absent' | 'late' | 'excused';
        notes?: string;
      }[];
    }
  ) => {
    const res = await fetch(`${config.baseURL}/attendance/sessions/${scheduleId}/mark`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json;
  },

  // GET student attendance history for a class
  getStudentHistory: async (studentId: number, classId: number) => {
    const res = await fetch(
      `${config.baseURL}/attendance/students/${studentId}/classes/${classId}/history`,
      {
        headers: getAuthHeader(),
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json;
  },
};
