import { create } from 'zustand';
import { type StateCreator } from 'zustand';
import { type User } from './types';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  walletAddress: string | null;
  isWalletConnected: boolean;
  pendingTransaction: string | null;
  registrationStep: 'idle' | 'wallet-connecting' | 'blockchain-pending' | 'firebase-pending' | 'completed';
  setUser: (user: User | null) => void;
  setWalletAddress: (address: string | null) => void;
  setWalletConnected: (isConnected: boolean) => void;
  setPendingTransaction: (hash: string | null) => void;
  setRegistrationStep: (step: AuthState['registrationStep']) => void;
}

const createAuthStore: StateCreator<AuthState> = (set) => ({
  isAuthenticated: false,
  user: null,
  walletAddress: null,
  isWalletConnected: false,
  pendingTransaction: null,
  registrationStep: 'idle',
  setUser: (user: User | null) => set((state) => ({ 
    user,
    isAuthenticated: !!user
  })),
  setWalletAddress: (address: string | null) => set({ walletAddress: address }),
  setWalletConnected: (isConnected: boolean) => set({ isWalletConnected: isConnected }),
  setPendingTransaction: (hash: string | null) => set({ pendingTransaction: hash }),
  setRegistrationStep: (step: AuthState['registrationStep']) => set({ registrationStep: step })
});

export const useAuthState = create(createAuthStore);