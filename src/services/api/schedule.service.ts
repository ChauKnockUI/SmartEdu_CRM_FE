import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const scheduleService = {
  // GET ALL SCHEDULE
  getAll: async () => {
    const res = await fetch(`${config.baseURL}/schedules`, {
      headers: getAuthHeader(),
    });

    return res.json();
  },

  // GET BY CLASS
  getByClass: async (classId: number) => {
    const res = await fetch(`${config.baseURL}/schedules/class/${classId}`, {
      headers: getAuthHeader(),
    });

    return res.json();
  },

  // CREATE
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

  // UPDATE
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

  // DELETE
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