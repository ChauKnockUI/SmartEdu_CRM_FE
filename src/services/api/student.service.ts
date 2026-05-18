import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => {
    const token = localStorage.getItem('token');

    return {
        ...config.headers,
        Authorization: `Bearer ${token}`,
    };
};

export const studentService = {
    // ================= LIST =================
    getAll: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        class_id?: number;
        has_debt?: boolean;
    }) => {
        const query = new URLSearchParams();

        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.search) query.append('search', params.search);
        if (params?.status) query.append('status', params.status);
        if (params?.class_id) query.append('class_id', String(params.class_id));
        if (params?.has_debt !== undefined) {
            query.append('has_debt', String(params.has_debt));
        }

        const res = await fetch(
            `${config.baseURL}/students?${query.toString()}`,
            {
                headers: getAuthHeader(),
            }
        );

        const json = await res.json();

        if (!res.ok) throw new Error(json.message || 'Lỗi tải học viên');

        return json;
    },

    // ================= DETAIL =================
    getById: async (id: number) => {
        const res = await fetch(`${config.baseURL}/students/${id}`, {
            headers: getAuthHeader(),
        });

        const json = await res.json();

        if (!res.ok) throw new Error(json.message);

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
};