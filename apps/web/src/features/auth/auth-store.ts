'use client';

import type { AuthResponseDto, AuthTokensDto, AuthenticatedUserDto } from '@northlane/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  clearSession: () => void;
  hasHydrated: boolean;
  setHydrated: (hasHydrated: boolean) => void;
  setSession: (response: AuthResponseDto) => void;
  tokens?: AuthTokensDto;
  user?: AuthenticatedUserDto;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      clearSession: () => set({ tokens: undefined, user: undefined }),
      hasHydrated: false,
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      setSession: (response) => set({ tokens: response.tokens, user: response.user }),
    }),
    {
      name: 'northlane-session',
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
      }),
    },
  ),
);
