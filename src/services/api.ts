import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // 401 của chính request đăng nhập = sai thông tin, để trang Đăng nhập tự báo lỗi
    // (nếu chuyển hướng ở đây, form bị tải lại và người dùng không thấy thông báo).
    const path = String(error.config?.url ?? '').split('?')[0];
    const isLoginRequest = path === '/auth/login' || path.endsWith('/api/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
