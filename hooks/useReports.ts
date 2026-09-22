import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api-client';

export interface RangeReportSummary {
  totalClients: number;
  totalDeposits: number;
  totalDepositAmount: number;
  totalWithdrawals: number;
  totalWithdrawalAmount: number;
  netFlow: number;
  avgDepositTicket: number;
}

export interface RangeReportDailyBucket {
  date: string;
  deposits: number;
  depositAmount: number;
  withdrawals: number;
  withdrawalAmount: number;
}

export interface RangeReportTopClient {
  id: string;
  name: string;
  depositAmount: number;
  depositCount: number;
}

export interface RangeReport {
  range: { start: string; end: string };
  summary: RangeReportSummary;
  daily: RangeReportDailyBucket[];
  topClients: RangeReportTopClient[];
  transactions: Array<{
    id: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    status: string;
    createdAt: string;
    client: { firstName: string; lastName: string };
    collector: { firstName: string; lastName: string };
  }>;
}

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

export function useRangeReport(start: Date, end: Date) {
  const startStr = toIsoDate(start);
  const endStr = toIsoDate(end);
  return useQuery<RangeReport>({
    queryKey: ['reports', 'range', startStr, endStr],
    queryFn: async () => {
      const { data } = await apiClient.get('/reports/range', {
        params: { startDate: startStr, endDate: endStr },
      });
      return data.data || data;
    },
    staleTime: 30_000,
  });
}
