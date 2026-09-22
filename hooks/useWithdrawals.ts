import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api-client';
import { WithdrawalRequest, InitiateWithdrawalPayload } from '../types/withdrawal.types';

export function useWithdrawals(status?: string) {
  return useQuery<{ withdrawals: WithdrawalRequest[] }>({
    queryKey: ['withdrawals', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await apiClient.get(`/withdrawals${params}`);
      return data.data || data;
    },
  });
}

export function useWithdrawal(id: string) {
  return useQuery<WithdrawalRequest>({
    queryKey: ['withdrawals', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/withdrawals/${id}`);
      return data.data || data;
    },
    enabled: !!id,
  });
}

export function useInitiateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InitiateWithdrawalPayload) => {
      const { data } = await apiClient.post('/withdrawals/initiate', payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
  });
}

export function useVerifyCodeAndComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, code, sendToClient }: { id: string; code: string; sendToClient?: boolean }) => {
      const { data } = await apiClient.post(`/withdrawals/${id}/verify-code`, {
        code,
        sendToClient: sendToClient ?? false,
      });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useResendWithdrawalCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/withdrawals/${id}/resend-code`);
      return data.data || data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals', id] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
  });
}

export function useRejectWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await apiClient.patch(`/withdrawals/${id}/reject`, { reason });
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
  });
}
