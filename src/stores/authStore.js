import { create } from 'zustand';

export const SESSION_KEY = 'gym-order-session';
const emptySession = { token: null, username: null };

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return emptySession;
    const session = JSON.parse(raw);
    if (
      typeof session?.token === 'string' &&
      session.token.startsWith('mock-') &&
      session.token.length > 5 &&
      typeof session.username === 'string' &&
      session.username.trim()
    ) {
      return { token: session.token, username: session.username.trim() };
    }
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // A corrupt or unavailable browser store must never grant access.
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Browsers may disable storage entirely. Keep the session signed out.
    }
  }
  return emptySession;
}

export const useAuthStore = create((set) => ({
  ...readSession(),
  login: (username) => {
    const normalized = username.trim();
    if (!normalized) throw new Error('请输入账号');
    const session = { token: `mock-${crypto.randomUUID()}`, username: normalized };
    // Save first: a storage failure must not create a session that disappears on refresh.
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    set(session);
  },
  logout: () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      set(emptySession);
    }
  },
}));
