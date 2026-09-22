import { Role } from './auth.types';

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: Role;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
  branch?: { id: string; name: string; city: string } | null;
  zones?: { id: string; name: string }[];
  _count?: { clients: number; collectorTransactions: number };
}

export interface DashboardStats {
  activeCollectors?: number;
  totalClients: number;
  pendingWithdrawals: number;
  today: {
    deposits: { count: number; amount: number };
    // Both collector and supervisor stat endpoints return withdrawals — keep
    // the field optional only as a defensive shim for older API responses
    // that the client cache may still hold during a rolling deploy.
    withdrawals: { count: number; amount: number };
  };
  month: {
    deposits: { count: number; amount: number };
    withdrawals: { count: number; amount: number };
  };
}
