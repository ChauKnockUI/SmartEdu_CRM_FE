import { getApiConfig } from './apiConfig';

const config = getApiConfig();

export interface ClassFilterOptions {
  courses: { id: number; name: string }[];
  teachers: { id: number; full_name: string }[];
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');

  return {
    ...config.headers,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const classService = {
  getFilterOptions: async (): Promise<{ data: ClassFilterOptions }> => {
    const res = await fetch(`${config.baseURL}/classes/filter-options`, { headers: getAuthHeader() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không tải được bộ lọc lớp học');
    return json;
  },
  getDropoutAlerts: async (classId?: number) => {
    const res = await fetch(`${config.baseURL}/classes/dropout-alerts${classId ? `?class_id=${classId}` : ''}`, { headers: getAuthHeader() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không tải được cảnh báo bỏ học');
    return json;
  },
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    course_id?: number;
    teacher_id?: number;
    unassigned_teacher?: boolean;
    room_id?: number;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });

    const res = await fetch(`${config.baseURL}/classes?${query.toString()}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  getMyClasses: async () => {
    const res = await fetch(`${config.baseURL}/classes/my/classes`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  getById: async (id: number) => {
    const res = await fetch(`${config.baseURL}/classes/${id}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  create: async (data: any) => {
    const res = await fetch(`${config.baseURL}/classes`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  update: async (id: number, data: any) => {
    const res = await fetch(`${config.baseURL}/classes/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  remove: async (id: number) => {
    const res = await fetch(`${config.baseURL}/classes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  checkConflicts: async (classId: number, studentIds: number[]) => {
    const res = await fetch(`${config.baseURL}/classes/${classId}/check-conflicts`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        student_ids: studentIds,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không thể kiểm tra xung đột lịch học');
    return json;
  },

  enrollStudents: async (classId: number, studentIds: number[], allowConflicts: boolean = false) => {
    const res = await fetch(`${config.baseURL}/classes/${classId}/enroll`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        student_ids: studentIds,
        allow_conflicts: allowConflicts,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || 'Ghi danh thất bại');
    }

    return json;
  },

  unenrollStudent: async (classId: number, studentId: number) => {
    const res = await fetch(`${config.baseURL}/classes/${classId}/enroll/${studentId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || 'Hủy ghi danh thất bại');
    }

    return json;
  },

  scoreDropoutRisk: async (classId: number) => {
    const res = await fetch(`${config.baseURL}/classes/${classId}/dropout-risk/score`, {
      method: 'POST',
      headers: getAuthHeader(),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || 'Không tính được dropout risk cho lớp');
    }

    return json;
  },
  getDropoutRisk: async (classId: number) => {
    const res = await fetch(`${config.baseURL}/classes/${classId}/dropout-risk`, { headers: getAuthHeader() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Không tải được kết quả đánh giá');
    return json;
  },
};
