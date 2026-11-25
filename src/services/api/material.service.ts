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

export const materialSessionLabel = (session: MaterialSession) => {
    const date = session.date.slice(0, 10).split('-').reverse().join('/');
    const time = (value: string | null) => value?.match(/(?:^|T)(\d{2}:\d{2})/)?.[1] || '--:--';
    return `Buổi ${date} · ${time(session.start_time)}–${time(session.end_time)}${session.status === 'cancelled' ? ' (nghỉ)' : ''}`;
};
export const materialFileSize = (size: number | null | undefined) => size == null ? ''
    : size < 1024 * 1024 ? Math.max(1, Math.ceil(size / 1024)) + ' KB' : (size / 1024 / 1024).toFixed(1) + ' MB';

export async function downloadMaterial(id: number, fileName: string) {
    const result = await materialService.getDownloadUrl(id);
    const response = await fetch(result.data.url);
    if (!response.ok) throw new Error('Không tải được file. Tệp có thể đã bị xóa hoặc không còn quyền truy cập.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const config = getApiConfig();
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(config.baseURL + path, { ...options,
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), ...options.headers },
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) throw new Error(result?.message || 'Không xử lý được tài liệu. Vui lòng thử lại.');
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
