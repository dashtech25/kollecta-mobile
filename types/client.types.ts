/**
 * MoMo provider enum — kept for *withdrawal* flows where the collector picks
 * which channel to send funds through. NOT used on the Client entity itself
 * any more, since a single client can hold both an Orange Money and an
 * MTN Mobile Money number simultaneously.
 */
export type MomoProvider = 'ORANGE_MONEY' | 'MTN_MONEY';

export interface ClientStats {
  totalDeposited: number;
  totalWithdrawn: number;
  depositCount: number;
  withdrawalCount: number;
  lastTransactionAt: string | null;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** When set, transaction OTPs and receipts ship via email instead of SMS. */
  email: string | null;
  orangeMoneyNumber: string | null;
  mtnMoneyNumber: string | null;
  address: string | null;
  idCardNumber: string | null;
  /** Base64 data URL or external URL of the KYC photo of the client's ID card */
  idCardPhoto: string | null;
  balance: number;
  collectorId: string;
  zoneId: string | null;
  isActive: boolean;
  createdAt: string;
  collector?: { id: string; firstName: string; lastName: string };
  zone?: { id: string; name: string } | null;
  /** Returned by GET /clients/:id; absent on list endpoints */
  stats?: ClientStats;
}

export interface CreateClientPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  orangeMoneyNumber?: string;
  mtnMoneyNumber?: string;
  address?: string;
  idCardNumber?: string;
  idCardPhoto?: string;
  zoneId?: string;
}

export type UpdateClientPayload = Partial<CreateClientPayload> & {
  isActive?: boolean;
};
