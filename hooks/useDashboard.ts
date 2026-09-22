import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api-client';
import { DashboardStats } from '../types/user.types';
import { Transaction } from '../types/transaction.types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/stats');
      return data.data || data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery<Transaction[]>({
    queryKey: ['dashboard', 'recent', limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/dashboard/recent-activity?limit=${limit}`);
      return data.data || data;
    },
    refetchInterval: 15000,
  });
}
