import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
        ...config.headers,
        Authorization: `Bearer ${token}`,
    };
};

export const roomService = {
    getAll: async (params: any) => {
        const query = new URLSearchParams();

        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        if (params.is_active !== undefined)
            query.append('is_active', String(params.is_active));
        if (params.min_capacity)
            query.append('min_capacity', params.min_capacity.toString());

        const res = await fetch(`${config.baseURL}/rooms?${query}`, {
            headers: getAuthHeader(),
        });

        const json = await res.json();

        if (!res.ok) throw new Error(json.message);

        return json;
    },

    getById: async (id: number) => {
        const res = await fetch(`${config.baseURL}/rooms/${id}`, {
            headers: getAuthHeader(),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message);

        return json;
    },

    create: async (data: any) => {
        const res = await fetch(`${config.baseURL}/rooms`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message);

        return json;
    },

    update: async (id: number, data: any) => {
        const res = await fetch(`${config.baseURL}/rooms/${id}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message);

        return json;
    },

    remove: async (id: number) => {
        const res = await fetch(`${config.baseURL}/rooms/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message);

        return json;
    },
};