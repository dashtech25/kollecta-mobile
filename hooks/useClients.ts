import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api-client';
import { Client, CreateClientPayload, UpdateClientPayload } from '../types/client.types';

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await apiClient.get('/clients');
      return data.data || data;
    },
  });
}

export function useClient(id: string) {
  return useQuery<Client>({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/clients/${id}`);
      return data.data || data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const { data } = await apiClient.post('/clients', payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateClientPayload) => {
      const { data } = await apiClient.patch(`/clients/${id}`, payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', id] });
    },
  });
}

export function useClientHistory(id: string, page = 1) {
  return useQuery({
    queryKey: ['clients', id, 'history', page],
    queryFn: async () => {
      const { data } = await apiClient.get(`/clients/${id}/history?page=${page}`);
      return data.data || data;
    },
    enabled: !!id,
  });
}
