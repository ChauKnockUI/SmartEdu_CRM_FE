import { getApiConfig } from './apiConfig';

const config = getApiConfig();

export interface StudentListParams {
    page?: number; limit?: number; search?: string; status?: string; class_id?: number; has_debt?: boolean;
}
const buildStudentQuery = (params?: StudentListParams) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    return query.toString();
};

const getAuthHeader = () => {
    const token = localStorage.getItem('token');

    return {
        ...config.headers,
        Authorization: `Bearer ${token}`,
    };
};

export const studentService = {
    getFilterOptions: async (signal?: AbortSignal): Promise<{ data: { classes: { id: number; name: string }[] } }> => {
        const res = await fetch(`${config.baseURL}/students/filter-options`, { headers: getAuthHeader(), signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Không tải được bộ lọc lớp học');
        return json;
    },
    exportCsv: async (params?: Omit<StudentListParams, 'page' | 'limit'>, signal?: AbortSignal) => {
        const res = await fetch(`${config.baseURL}/students/export?${buildStudentQuery(params)}`, { headers: getAuthHeader(), signal });
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

        const res = await fetch(
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
        const res = await fetch(`${config.baseURL}/students/me`, { headers: getAuthHeader(), signal });
        const json = await res.json();
        if (!res.ok) throw Object.assign(new Error(json.message || 'Không tải được hồ sơ cá nhân'), { status: res.status });
        return json;
    },
    getById: async (id: number, signal?: AbortSignal) => {
        const res = await fetch(`${config.baseURL}/students/${id}`, {
            headers: getAuthHeader(),
            signal,
        });

        const json = await res.json();

        if (!res.ok) throw Object.assign(new Error(json.message || 'Không tải được hồ sơ học viên'), { status: res.status });

        return json;
    },

    // ================= CREATE =================
    create: async (data: any) => {
        const res = await fetch(`${config.baseURL}/students`, {
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
        const res = await fetch(`${config.baseURL}/students/${id}`, {
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
        const res = await fetch(
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
        const res = await fetch(
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
        const res = await fetch(`${config.baseURL}/students/${id}/dropout-risk`, { headers: getAuthHeader(), signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Không tải được đánh giá theo lớp');
        return json;
    },
};
