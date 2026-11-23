import { getApiConfig } from './apiConfig';

export interface MaterialSession {
    id: number; date: string; start_time: string | null; end_time: string | null; status: string;
}
export interface ClassMaterial {
    id: number; class_id: number; schedule_id: number | null; title: string;
    file_name: string; file_type: string | null; file_size: number | null; created_at: string;
    users?: { id: number; full_name: string }; schedule?: MaterialSession | null; can_manage: boolean;
}
export interface MaterialList {
    success: boolean; class_id: number; data: ClassMaterial[]; schedules: MaterialSession[];
    can_upload_common: boolean; can_upload_schedule_ids: number[];
}
type MaterialInput = { title: string; schedule_id: number | null; file?: File };

const config = getApiConfig();
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(config.baseURL + path, { ...options,
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), ...options.headers },
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Không xử lý được tài liệu.');
    return result;
}
function formData(data: MaterialInput) {
    const form = new FormData();
    form.append('title', data.title);
    form.append('schedule_id', data.schedule_id === null ? '' : String(data.schedule_id));
    if (data.file) form.append('file', data.file);
    return form;
}
export const materialService = {
    getByClass: (classId: number, signal?: AbortSignal) => request<MaterialList>('/classes/' + classId + '/materials', { signal }),
    getBySession: (scheduleId: number, signal?: AbortSignal) => request<MaterialList>('/schedules/' + scheduleId + '/materials', { signal }),
    upload: (classId: number, data: MaterialInput & { file: File }) =>
        request<{ success: boolean; data: ClassMaterial }>('/classes/' + classId + '/materials', { method: 'POST', body: formData(data) }),
    update: (id: number, data: MaterialInput) =>
        request<{ success: boolean; data: ClassMaterial }>('/materials/' + id, { method: 'PUT', body: formData(data) }),
    remove: (id: number) => request<{ success: boolean }>('/materials/' + id, { method: 'DELETE' }),
    getDownloadUrl: (id: number) => request<{ data: { url: string; expires_in: number } }>('/materials/' + id + '/download'),
};
