import { create } from 'zustand';

type SessionState = {
  token?: string;
  setToken: (token?: string) => void;
};

export const useSession = create<SessionState>((set) => ({
  token: undefined,
  setToken: (token) => set({ token })
}));

