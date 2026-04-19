import { getApiConfig } from "./apiConfig";

const config = getApiConfig();

type LoginPayload = {
    email: string;
    password: string;
};

export const authService = {
    login: async (data: LoginPayload) => {
        const res = await fetch(`${config.baseURL}/auth/login`, {
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

    getMe: async (token: string) => {
        const res = await fetch(`${config.baseURL}/auth/me`, {
            headers: {
                ...config.headers,
                Authorization: `Bearer ${token}`,
            },
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.message);
        }

        return json;
    },

    register: async (data: any) => {
        const res = await fetch(`${config.baseURL}/auth/register`, {
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

