import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('happen_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('happen_token');
      localStorage.removeItem('happen_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
