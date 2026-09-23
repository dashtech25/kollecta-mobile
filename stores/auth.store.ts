import { create } from 'zustand';
import * as SecureStore from '../services/secure-storage';
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

/**
 * The backend can skip the OTP step entirely (OTP_LOGIN_ENABLED=false —
 * used while the project isn't ready to require a code on every login).
 * The UI must branch on `otpRequired` instead of assuming a pending session
 * always follows step 1, otherwise it pushes to the OTP screen with an
 * empty pendingLoginId and step 2 fails validation.
 */
export type LoginResult =
  | { otpRequired: true; pending: PendingLogin }
  | { otpRequired: false };

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /**
   * Step 1: validate credentials. If the backend requires an OTP, returns
   * the pending bag the UI must hand back to `confirmLoginOtp` — the user
   * is NOT marked authenticated yet. If OTP is disabled, the session is
   * finalized right here (same as `confirmLoginOtp` would do).
   */
  requestLoginOtp: (login: string, password: string) => Promise<LoginResult>;

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
    const result = data.data || data;

    if (result.otpRequired === false) {
      // OTP_LOGIN_ENABLED=false server-side — tokens are already here,
      // finalize the session the same way confirmLoginOtp would.
      await SecureStore.setItemAsync('accessToken', result.accessToken);
      await SecureStore.setItemAsync('refreshToken', result.refreshToken);
      set({ user: result.user, isAuthenticated: true });
      return { otpRequired: false as const };
    }

    return { otpRequired: true as const, pending: result as PendingLogin };
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
