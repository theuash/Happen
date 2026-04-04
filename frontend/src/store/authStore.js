import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('happen_user')) || null,
  token: localStorage.getItem('happen_token') || null,
  login: (user, token) => {
    localStorage.setItem('happen_user', JSON.stringify(user));
    localStorage.setItem('happen_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('happen_user');
    localStorage.removeItem('happen_token');
    set({ user: null, token: null });
  },
}));
