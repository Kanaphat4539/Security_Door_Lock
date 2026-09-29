import axios from 'axios';

// Ensure the API base URL points to our NestJS backend
// backend ของเราไม่มี prefix /api — route เป็น /auth, /access, /users, /devices ตรง ๆ
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
      } else if (
        !config.url?.includes('/auth/login') &&
        !config.url?.includes('/auth/register')
      ) {
        // ไม่มี token และไม่ใช่ route สมัคร/ล็อกอิน -> ตัดคำขอทิ้งทันที
        // ป้องกันไม่ให้ยิง request หลุดไปโดน 401 ตอนกำลังกด Logout
        const controller = new AbortController();
        config.signal = controller.signal;
        controller.abort('Logged out');
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
    // ถ้าคำขอถูกยกเลิกเพราะไม่มี token ให้เงียบไว้ ไม่ต้องโยน error ขึ้น UI
    if (axios.isCancel(error)) {
      return new Promise(() => {});
    }
    const url: string = error.config?.url ?? '';
    // ไม่เด้งตอนล็อกอิน/สมัคร/ตรวจ me ผิด — ให้หน้า login โชว์ error เอง
    const isAuthCall = url.includes('/auth/');
    if (error.response?.status === 401 && !isAuthCall) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        document.cookie =
          'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
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
