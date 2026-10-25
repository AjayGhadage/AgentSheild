import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('as_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('as_token');
      localStorage.removeItem('as_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
