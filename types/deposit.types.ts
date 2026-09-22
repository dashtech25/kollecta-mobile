import { MomoProvider } from './client.types';

export type DepositMethod = 'CASH' | 'MOMO';

export type DepositStatus =
  | 'INITIATED'
  | 'CODE_VERIFIED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED';

export interface DepositRequest {
  id: string;
  transactionId: string | null;
  clientId: string;
  collectorId: string;
  amount: number;
  status: DepositStatus;
  method: DepositMethod;
  momoProvider: MomoProvider | null;
  momoNumber: string | null;
  otpChannel: string | null;
  otpExpiresAt: string | null;
  otpVerified: boolean;
  otpAttempts: number;
  receiptUrl: string | null;
  receiptSentAt: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  initiatedAt: string;
  completedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { firstName: string; lastName: string; phone: string };
  collector?: { firstName: string; lastName: string };
}

export interface InitiateDepositPayload {
  clientId: string;
  amount: number;
  method: DepositMethod;
  momoProvider?: MomoProvider;
  momoNumber?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
}
