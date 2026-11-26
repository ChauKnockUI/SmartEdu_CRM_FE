import { apiFetch } from './listCache';
import { getApiConfig } from './apiConfig';
import type { ScheduleChange } from './schedule.service';

const config = getApiConfig();

export interface StudentListParams {
    page?: number; limit?: number; search?: string; status?: string; class_id?: number; exclude_class_id?: number; has_debt?: boolean;
}
export interface StudentSchedule {
    id: number; class_id: number | null; date: string; start_time: string | null; end_time: string | null; status: string;
    class: { id: number; name: string; status: string } | null;
    teacher: { id: number; full_name: string } | null; room: { id: number; name: string } | null;
    scheduleChange: Pick<ScheduleChange, 'pendingMakeup' | 'isMakeup' | 'history'>;
    attendances: { status: string }[];
}
export interface StudentScheduleParams {
    start_date: string; end_date: string; class_id?: number; page?: number; limit?: number;
}
const buildStudentQuery = (params?: StudentListParams) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    return query.toString();
};

const getAuthHeader = (token = localStorage.getItem('token')) => {

    return {
        ...config.headers,
        Authorization: `Bearer ${token}`,
    };
};

export const studentService = {
    getSchedules: async (studentId: number, params: StudentScheduleParams, signal?: AbortSignal, token?: string): Promise<{
        data: StudentSchedule[]; pagination: { total: number; page: number; limit: number; totalPages: number };
    }> => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
        const res = await apiFetch(`${config.baseURL}/students/${studentId}/schedules?${query}`, { headers: getAuthHeader(token), signal });
        const json = await res.json();
        if (!res.ok || !json.success || !Array.isArray(json.data) || !Number.isInteger(json.pagination?.total))
            throw new Error(json.message || 'Không tải được lịch học của học viên.');
        return json;
    },
    getFilterOptions: async (signal?: AbortSignal): Promise<{ data: { classes: { id: number; name: string }[] } }> => {
        const res = await apiFetch(`${config.baseURL}/students/filter-options`, { headers: getAuthHeader(), signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Không tải được bộ lọc lớp học');
        return json;
    },
    exportCsv: async (params?: Omit<StudentListParams, 'page' | 'limit'>, signal?: AbortSignal) => {
        const res = await apiFetch(`${config.baseURL}/students/export?${buildStudentQuery(params)}`, { headers: getAuthHeader(), signal });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Không xuất được danh sách học viên');
        }
        if (!res.headers.get('content-type')?.includes('text/csv')) throw new Error('Dữ liệu xuất không đúng định dạng CSV.');
        return res.blob();
    },
    // ================= LIST =================
    getAll: async (params?: StudentListParams, signal?: AbortSignal) => {
        const query = buildStudentQuery(params);

        const res = await apiFetch(
            `${config.baseURL}/students?${query}`,
            {
                headers: getAuthHeader(),
                signal,
            }
        );

        const json = await res.json();

        if (!res.ok) throw new Error(json.message || 'Lỗi tải học viên');

        return json;
    },

    // ================= DETAIL =================
    getMyProfile: async (signal?: AbortSignal) => {
        const res = await apiFetch(`${config.baseURL}/students/me`, { headers: getAuthHeader(), signal });
        const json = await res.json();
        if (!res.ok) throw Object.assign(new Error(json.message || 'Không tải được hồ sơ cá nhân'), { status: res.status });
        return json;
    },
    getById: async (id: number, signal?: AbortSignal) => {
        const res = await apiFetch(`${config.baseURL}/students/${id}`, {
            headers: getAuthHeader(),
            signal,
        });

        const json = await res.json();

        if (!res.ok) throw Object.assign(new Error(json.message || 'Không tải được hồ sơ học viên'), { status: res.status });

        return json;
    },

    // ================= CREATE =================
    create: async (data: any) => {
        const res = await apiFetch(`${config.baseURL}/students`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.message || 'Tạo học viên thất bại');
        }

        return json;
    },

    // ================= UPDATE =================
    update: async (id: number, data: any) => {
        const res = await apiFetch(`${config.baseURL}/students/${id}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) throw new Error(json.message);

        return json;
    },
    // ================= RESET PASSWORD =================
    resetPassword: async (id: number) => {
        const res = await apiFetch(
            `${config.baseURL}/students/${id}/reset-password`,
            {
                method: 'POST',
                headers: getAuthHeader(),
            }
        );

        const json = await res.json();

        if (!res.ok) throw new Error(json.message);

        return json;
    },

    scoreDropoutRisk: async (id: number, classId: number) => {
        const res = await apiFetch(
            `${config.baseURL}/students/${id}/dropout-risk/score?class_id=${classId}`,
            {
                method: 'POST',
                headers: getAuthHeader(),
            }
        );

        const json = await res.json();

        if (!res.ok) throw new Error(json.message);

        return json;
    },
    getClassDropoutRisks: async (id: number, signal?: AbortSignal) => {
        const res = await apiFetch(`${config.baseURL}/students/${id}/dropout-risk`, { headers: getAuthHeader(), signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Không tải được đánh giá theo lớp');
        return json;
    },
};
