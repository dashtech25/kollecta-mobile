import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api-client';
import {
  Transaction,
  TransactionDetail,
  PaginatedResponse,
  TransactionType,
  TransactionStatus,
} from '../types/transaction.types';

export interface TransactionsFilters {
  clientId?: string;
  collectorId?: string;
  branchId?: string;
  zoneId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export function useTransactions(filters: TransactionsFilters = {}) {
  const {
    clientId,
    collectorId,
    branchId,
    zoneId,
    type,
    status,
    search,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    page = 1,
    limit = 50,
  } = filters;
  return useQuery<PaginatedResponse<Transaction>>({
    queryKey: [
      'transactions',
      {
        clientId,
        collectorId,
        branchId,
        zoneId,
        type,
        status,
        search,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page,
        limit,
      },
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (clientId) params.clientId = clientId;
      if (collectorId) params.collectorId = collectorId;
      if (branchId) params.branchId = branchId;
      if (zoneId) params.zoneId = zoneId;
      if (type) params.type = type;
      if (status) params.status = status;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (minAmount !== undefined) params.minAmount = String(minAmount);
      if (maxAmount !== undefined) params.maxAmount = String(maxAmount);
      const { data } = await apiClient.get('/transactions', { params });
      return data.data || data;
    },
    staleTime: 15_000,
  });
}

/**
 * Detail lookup for the transaction sheet. Loads the full payload including
 * the deposit/withdrawal request and the geolocation logs around the seal,
 * which the list view doesn't ship to keep the payload tight.
 */
export function useTransactionDetail(id: string | null | undefined) {
  return useQuery<TransactionDetail>({
    queryKey: ['transaction', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await apiClient.get(`/transactions/${id}`);
      return data.data || data;
    },
    staleTime: 30_000,
  });
}
