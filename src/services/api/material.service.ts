import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const materialService = {
    // GET materials by class
    getByClass: async (classId: number) => {
        const res = await fetch(`${config.baseURL}/classes/${classId}/materials`, {
            headers: getAuthHeader(),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Lỗi tải tài liệu');

        return json;
    },
    // UPLOAD material
    upload: async (
  classId: number,
  data: {
    title: string;
    file: File;
  }
) => {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('file', data.file);

  const res = await fetch(`${config.baseURL}/classes/${classId}/materials`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Upload tài liệu thất bại');

  return json;
},

    // UPDATE material
    update: async (
        materialId: number,
        data: {
            title?: string;
            file?: File;
        }
    ) => {
        const formData = new FormData();

        if (data.title) {
            formData.append('title', data.title);
        }

        if (data.file) {
            formData.append('file', data.file);
        }

        const res = await fetch(
            `${config.baseURL}/materials/${materialId}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData,
            }
        );

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.message || 'Cập nhật tài liệu thất bại');
        }

        return json;
    },

    // DELETE material
    remove: async (materialId: number) => {
        const res = await fetch(
            `${config.baseURL}/materials/${materialId}`,
            {
                method: 'DELETE',
                headers: getAuthHeader(),
            }
        );

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.message || 'Xóa tài liệu thất bại');
        }

        return json;
    },
};