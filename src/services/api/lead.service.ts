import { getApiConfig } from './apiConfig';

const config = getApiConfig();

export const leadService = {
  getAll: async () => {
    const res = await fetch(`${config.baseURL}/leads`);

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message);
    }

    return json;
  },

  create: async (data: any) => {
    const res = await fetch(`${config.baseURL}/leads`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message);
    }

    return json;
  },
};