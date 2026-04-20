import { create } from 'zustand';

// Migrate stale sessions: if stored user has no role (old broken format), clear it
const storedUser = (() => {
  try {
    const u = JSON.parse(localStorage.getItem('happen_user'));
    // Old bug stored the full { token, user } object — detect and discard
    if (u && (u.token !== undefined || !u.role)) {
      localStorage.removeItem('happen_user');
      localStorage.removeItem('happen_token');
      return null;
    }
    return u;
  } catch {
    return null;
  }
})();

export const useAuthStore = create((set) => ({
  user: storedUser,
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
