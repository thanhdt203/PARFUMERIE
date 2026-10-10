import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const api = axios.create({ baseURL, withCredentials: true });

// gắn access token vào mọi request
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// access token hết hạn (backend trả 403) -> refresh rồi gọi lại request cũ
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as RetryConfig;
    const message: string = error.response?.data?.message ?? '';
    const expired = error.response?.status === 403 && message.includes('Access token');

    if (expired && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
