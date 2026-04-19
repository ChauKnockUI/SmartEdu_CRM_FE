import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  };
};

export const leadService = {
  getAll: async (page = 1, limit = 10) => {
    const res = await fetch(`${config.baseURL}/leads?page=${page}&limit=${limit}`, {
      headers: getAuthHeader(), 
    });
    return res.json();
  },

  getById: async (id: string) => {
    const res = await fetch(`${config.baseURL}/leads/${id}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    return json;
  },

  // 🔥 CREATE
  create: async (data: any) => {
    const res = await fetch(`${config.baseURL}/leads`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    return json;
  },

  // 🔥 UPDATE
  update: async (id: string, data: any) => {
    const res = await fetch(`${config.baseURL}/leads/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    return json;
  },

  // 🔥 DELETE
  remove: async (id: string) => {
    const res = await fetch(`${config.baseURL}/leads/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    return json;
  },
};