import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
    ...config.headers,
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const courseService = {
    getAll: async (page = 1, limit = 10, search = '') => {
        const res = await fetch(
            `${config.baseURL}/courses?page=${page}&limit=${limit}&search=${search}`,
            {
                headers: getAuthHeader(),
            }
        );
        const json = await res.json();
        return json;
    },

    getById: async (id: number) => {
        const res = await fetch(`${config.baseURL}/courses/${id}`, {
            headers: getAuthHeader(),
        });
        return res.json();
    },

    create: async (data: any) => {
        const res = await fetch(`${config.baseURL}/courses`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    update: async (id: number, data: any) => {
        const res = await fetch(`${config.baseURL}/courses/${id}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    remove: async (id: number) => {
        const res = await fetch(`${config.baseURL}/courses/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return res.json();
    },
};