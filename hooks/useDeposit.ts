import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api-client';
import {
  DepositRequest,
  InitiateDepositPayload,
  DepositStatus,
} from '../types/deposit.types';

export function useDeposits(status?: DepositStatus) {
  return useQuery<{ deposits: DepositRequest[] }>({
    queryKey: ['deposits', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await apiClient.get(`/deposits${params}`);
      return data.data || data;
    },
  });
}

export function useDeposit(id: string | null) {
  return useQuery<DepositRequest>({
    queryKey: ['deposits', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/deposits/${id}`);
      return data.data || data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useInitiateDeposit() {
  const queryClient = useQueryClient();
  return useMutation<DepositRequest, any, InitiateDepositPayload>({
    mutationFn: async (payload: InitiateDepositPayload) => {
      const { data } = await apiClient.post('/deposits/initiate', payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
  });
}

export function useVerifyDepositCode() {
  const queryClient = useQueryClient();
  return useMutation<DepositRequest, any, { id: string; code: string }>({
    mutationFn: async ({ id, code }) => {
      const { data } = await apiClient.post(`/deposits/${id}/verify-code`, {
        code,
      });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useResendDepositCode() {
  const queryClient = useQueryClient();
  return useMutation<DepositRequest, any, { id: string }>({
    mutationFn: async ({ id }) => {
      const { data } = await apiClient.post(`/deposits/${id}/resend-code`);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
  });
}

export function useRejectDeposit() {
  const queryClient = useQueryClient();
  return useMutation<DepositRequest, any, { id: string; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      const { data } = await apiClient.patch(`/deposits/${id}/reject`, {
        reason,
      });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
  });
}
