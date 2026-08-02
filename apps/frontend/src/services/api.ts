import axios from 'axios';

// Ensure the API base URL points to our NestJS backend
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 10000,
});

// Request interceptor to attach tokens
api.interceptors.request.use(
  (config) => {
    // Check if we are running in the browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        // Redirect to login if unauthorized
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authApi = {
  login: async (credentials: Record<string, string>) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (data: Record<string, string>) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getWsTicket: async () => {
    const res = await api.post('/auth/ws-ticket');
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};
