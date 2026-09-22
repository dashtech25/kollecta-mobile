export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type DepositMethod = 'CASH' | 'MOMO';
export type MomoProvider = 'ORANGE_MONEY' | 'MTN_MONEY';

export interface BranchMini {
  id: string;
  name: string;
  city: string;
}

export interface ZoneMini {
  id: string;
  name: string;
}

/**
 * Joined deposit-request payload returned by `/transactions` (admin/supervisor).
 * Mirrors the Prisma `DepositRequest` columns the backend exposes.
 */
export interface DepositRequestEmbedded {
  id: string;
  status: string;
  method: DepositMethod;
  momoProvider: MomoProvider | null;
  momoNumber: string | null;
  otpVerified: boolean;
  otpChannel: string | null;
  receiptUrl: string | null;
  receiptSentAt: string | null;
  note: string | null;
  initiatedAt: string;
  completedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface WithdrawalRequestEmbedded {
  id: string;
  status: string;
  method: DepositMethod;
  momoProvider: MomoProvider | null;
  momoNumber: string | null;
  smsCodeVerified: boolean;
  sentToClient: boolean;
  sentToClientAt: string | null;
  initiatedAt: string;
  fundsSentAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  /** Resolved server-side from disk on read; null if no receipt PDF yet. */
  receiptUrl?: string | null;
  receiptSentAt?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  clientId: string;
  collectorId: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
  client?: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    balance?: number;
    zone?: ZoneMini | null;
  };
  collector?: {
    id?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    branch?: BranchMini | null;
  };
  depositRequest?: DepositRequestEmbedded | null;
  withdrawalRequest?: WithdrawalRequestEmbedded | null;
}

export interface CreateDepositPayload {
  clientId: string;
  amount: number;
  latitude?: number;
  longitude?: number;
  note?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionTotals {
  deposits: { count: number; amount: number };
  withdrawals: { count: number; amount: number };
}

/**
 * Backend now returns aggregate totals alongside the list. Older callers that
 * only typed `{ transactions, pagination }` keep working since `totals` is
 * declared optional, and the supervisor/collector list views opt into it.
 */
export interface PaginatedResponse<T> {
  transactions: T[];
  pagination: PaginationMeta;
  totals?: TransactionTotals;
}

/** Detail payload returned by `GET /transactions/:id`. */
export interface TransactionDetail extends Transaction {
  geolocationLogs?: Array<{
    id: string;
    userId: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    action: string;
    referenceId: string | null;
    createdAt: string;
  }>;
}
