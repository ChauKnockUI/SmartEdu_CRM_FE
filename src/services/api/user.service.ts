import { getApiConfig } from './apiConfig';

const config = getApiConfig();

const getAuthHeader = () => ({
  ...config.headers,
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const request = async (endpoint: string) => {
  const res = await fetch(`${config.baseURL}${endpoint}`, {
    headers: getAuthHeader(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
};

export const userService = {
  getSales: async () => request('/users/sales'),
};
