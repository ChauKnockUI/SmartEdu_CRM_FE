import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
    ...config.headers,
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export interface Course {
    id: number;
    name: string;
    description?: string | null;
    total_sessions: number;
    duration_weeks: number;
    fee: number | string;
    is_active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CourseInput {
    name: string;
    description?: string;
    total_sessions: number;
    duration_weeks: number;
    fee: number;
    is_active: boolean;
}

export interface CourseClass {
    id: number;
    name: string;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
    max_students?: number | null;
    teacher?: { full_name: string } | null;
    // The course endpoint returns only classes visible to the current user,
    // with active enrollments counted within each visible class.
    _count?: { classEnrollments: number };
}

interface CourseResponse<T> {
    success: boolean;
    data: T;
}

interface CourseListResponse extends CourseResponse<Course[]> {
    pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface CourseClassesResponse extends CourseResponse<CourseClass[]> {
    // Unique active student IDs across the classes visible to the current user.
    summary?: { total_students: number };
}

async function request<T>(path: string, fallbackMessage: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${config.baseURL}${path}`, {
        ...options,
        headers: getAuthHeader(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success !== true) {
        throw new Error(json?.message || `${fallbackMessage} (HTTP ${res.status})`);
    }
    return json;
}

export const courseService = {
    getAll: async (page = 1, limit = 10, search = '', isActive?: boolean | 'all', signal?: AbortSignal) => {
        const query = new URLSearchParams({ page: String(page), limit: String(limit), search });
        // Omit for existing dropdown clients; the backend defaults to active courses.
        if (isActive !== undefined) query.set('is_active', String(isActive));
        const result = await request<CourseListResponse>(`/courses?${query}`, 'Lỗi tải danh sách khóa học', { signal });
        if (!Array.isArray(result.data) || !Number.isInteger(result.pagination?.total) || result.pagination.total < 0) {
            throw new Error('Dữ liệu danh sách khóa học không hợp lệ');
        }
        return result;
    },

    getById: async (id: number, signal?: AbortSignal) => {
        const result = await request<CourseResponse<Course>>(`/courses/${id}`, 'Lỗi tải khóa học', { signal });
        if (!result.data) throw new Error('Không tìm thấy khóa học');
        return result;
    },

    create: async (data: CourseInput) => {
        const result = await request<CourseResponse<Course>>('/courses', 'Tạo khóa học thất bại', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!result.data) throw new Error('API chưa trả thông tin khóa học đã tạo');
        return result;
    },

    update: async (id: number, data: CourseInput) => {
        const result = await request<CourseResponse<Course>>(`/courses/${id}`, 'Cập nhật khóa học thất bại', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!result.data) throw new Error('API chưa trả thông tin khóa học đã cập nhật');
        return result;
    },

    remove: async (id: number) => {
        return request<{ success: boolean }>(`/courses/${id}`, 'Xóa khóa học thất bại', {
            method: 'DELETE',
        });
    },

    getClasses: async (courseId: number, signal?: AbortSignal) => {
        const result = await request<CourseClassesResponse>(
            `/courses/${courseId}/classes`, 'Lỗi tải danh sách lớp', { signal }
        );
        if (!Array.isArray(result.data)) throw new Error('Dữ liệu danh sách lớp không hợp lệ');
        return result;
    },
};
