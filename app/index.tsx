import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getTenantDomain } from '../services/tenant';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Un utilisateur non authentifié doit d'abord avoir choisi son
      // organisation (une seule app sert toutes les organisations) avant de
      // pouvoir se connecter.
      getTenantDomain().then((domain) => {
        router.replace(domain ? '/(auth)/login' : '/(auth)/select-organization');
      });
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
