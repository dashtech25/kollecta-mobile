import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    // Route based on role
    if (user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') {
      router.replace('/(supervisor)/(tabs)');
    } else {
      router.replace('/(collector)/(tabs)');
    }
  }, [isAuthenticated, isLoading, user]);

  return <LoadingSpinner />;
}
