import { MomoProvider } from './client.types';

export type WithdrawalStatus =
  | 'INITIATED'
  | 'FUNDS_SENT'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED';

/**
 * Mode de retrait. Aligned with `DepositMethod` on the backend so a single
 * picker component can be reused across the deposit and withdrawal flows.
 */
export type WithdrawalMethod = 'CASH' | 'MOMO';

export interface WithdrawalRequest {
  id: string;
  clientId: string;
  collectorId: string;
  amount: number;
  status: WithdrawalStatus;
  /** MOMO by default; CASH means cash is paid out directly by the collector. */
  method: WithdrawalMethod;
  /** Null when method = CASH. */
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
  createdAt: string;
  client?: { firstName: string; lastName: string; phone: string };
  collector?: { firstName: string; lastName: string };
  // OTP resend tracking (server-driven cooldown).
  smsCodeExpiresAt?: string | null;
  smsLastSentAt?: string | null;
  smsResendCount?: number;
  /** Server-computed: 0 means resend is allowed immediately. */
  nextResendInSeconds?: number;
  /** Server-driven cap for resends; usually 5. */
  maxResends?: number;
  otpTtlMinutes?: number;
  /**
   * Resolved on-the-fly server-side from the receipt store. Null while the
   * PDF is still being generated (best-effort, async after completion) or if
   * generation failed earlier. Same 30-day signed-URL TTL as deposits.
   */
  receiptUrl?: string | null;
  receiptSentAt?: string | null;
  /** Server-side reference linking this withdrawal to its sealed transaction. */
  transactionId?: string | null;
}

export interface InitiateWithdrawalPayload {
  clientId: string;
  amount: number;
  /** Optional — server defaults to MOMO. */
  method?: WithdrawalMethod;
  /** Required when method = MOMO. */
  momoProvider?: MomoProvider;
  /** Required when method = MOMO. */
  momoNumber?: string;
  latitude?: number;
  longitude?: number;
}
