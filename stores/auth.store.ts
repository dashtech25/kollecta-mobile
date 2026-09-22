import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient, { setOnSessionLost } from '../services/api-client';
import { User } from '../types/auth.types';

export interface PendingLogin {
  pendingLoginId: string;
  channel: 'sms' | 'email';
  /** Pre-masked target shown to the user, e.g. "+237••••••••12". */
  deliveredTo: string;
  expiresAt: string;
  resendAvailableInSeconds: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /**
   * Step 1: validate credentials and trigger an OTP. Returns the pending
   * login bag the UI must hand back to `confirmLoginOtp`. The user is NOT
   * marked authenticated at this step.
   */
  requestLoginOtp: (login: string, password: string) => Promise<PendingLogin>;

  /** Step 2: verify the OTP and finalize the session. */
  confirmLoginOtp: (pendingLoginId: string, otp: string) => Promise<void>;

  /** Re-issue the OTP using the same pending session. */
  resendLoginOtp: (pendingLoginId: string) => Promise<PendingLogin>;

  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  requestLoginOtp: async (login: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { login, password });
    return (data.data || data) as PendingLogin;
  },

  confirmLoginOtp: async (pendingLoginId: string, otp: string) => {
    const { data } = await apiClient.post('/auth/login/verify-otp', {
      pendingLoginId,
      otp,
    });
    const result = data.data || data;

    await SecureStore.setItemAsync('accessToken', result.accessToken);
    await SecureStore.setItemAsync('refreshToken', result.refreshToken);

    set({ user: result.user, isAuthenticated: true });
  },

  resendLoginOtp: async (pendingLoginId: string) => {
    const { data } = await apiClient.post('/auth/login/resend-otp', {
      pendingLoginId,
    });
    return (data.data || data) as PendingLogin;
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore logout errors
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      // Validate token by fetching user profile
      const { data } = await apiClient.get('/users/profile');
      const user = data.data || data;
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Wire the api-client → auth store bridge.
// When a refresh-token rotation fails (e.g. backend reseed invalidated the
// underlying user), api-client deletes tokens and calls this handler. Flipping
// `isAuthenticated` to false makes the root redirector route to /login on the
// next render — no manual intervention needed from the user.
setOnSessionLost(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});
