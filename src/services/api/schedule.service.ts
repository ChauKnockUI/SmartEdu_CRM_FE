import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const scheduleService = {
  getAll: async () => {
    const res = await fetch(`${config.baseURL}/schedules`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  getMySchedules: async () => {
    const res = await fetch(`${config.baseURL}/schedules/my/schedules`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  getByClass: async (classId: number) => {
    const res = await fetch(`${config.baseURL}/schedules/class/${classId}`, {
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  create: async (data: any) => {
    const res = await fetch(`${config.baseURL}/schedules`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  update: async (id: number, data: any) => {
    const res = await fetch(`${config.baseURL}/schedules/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },

  remove: async (id: number) => {
    const res = await fetch(`${config.baseURL}/schedules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    return json;
  },
};