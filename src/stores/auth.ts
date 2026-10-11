import { create } from 'zustand';

import type { Profile, Role } from '@/types/database';

interface AuthState {
  /** Profil pengguna yang sedang login (null = belum login / belum dimuat). */
  profile: Profile | null;
  /** Status pemuatan profil saat sesi baru saja ditemukan. */
  loading: boolean;
  /** Pesan error dari operasi auth (ditampilkan di layar login). */
  error: string | null;

  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  /** Role turunan untuk mempermudah routing. */
  role: () => Role | null;
  isTeacher: () => boolean;
  isStudent: () => boolean;
  signOutLocal: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  loading: true,
  error: null,

  setProfile: (profile) => set({ profile, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  role: () => get().profile?.role ?? null,
  isTeacher: () => get().profile?.role === 'teacher',
  isStudent: () => get().profile?.role === 'student',

  signOutLocal: () => set({ profile: null, loading: false, error: null }),
}));
