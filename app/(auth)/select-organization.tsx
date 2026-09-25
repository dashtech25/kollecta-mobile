import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { DEFAULT_TENANT_DOMAIN_HINT } from '../../constants/config';
import apiClient from '../../services/api-client';
import { setTenantDomain, setTenantBranding } from '../../services/tenant';

/**
 * Premier écran vu par un utilisateur sans organisation déjà choisie sur cet
 * appareil : une seule app, publiée une fois, sert toutes les organisations
 * — chaque utilisateur saisit le domaine de la sienne, résolu ici contre
 * /public/branding (même résolution que TenantMiddleware côté backend,
 * sans authentification requise).
 */
export default function SelectOrganizationScreen() {
  const [domain, setDomain] = useState(DEFAULT_TENANT_DOMAIN_HINT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) {
      setError('Veuillez entrer le domaine de votre organisation');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.get('/public/branding', {
        params: { host: trimmed },
      });
      const branding = data.data || data;
      await setTenantDomain(trimmed);
      await setTenantBranding({
        name: branding.name,
        logoUrl: branding.logoUrl ?? null,
        primaryColor: branding.primaryColor ?? null,
        secondaryColor: branding.secondaryColor ?? null,
      });
      router.replace('/(auth)/login');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Aucune organisation ne correspond à ce domaine.");
      } else if (err.code === 'ERR_NETWORK') {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      } else {
        setError('Une erreur est survenue. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.iconRing}>
            <Ionicons name="business-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Votre organisation</Text>
          <Text style={styles.subtitle}>
            Entrez le domaine fourni par votre organisation pour continuer.
          </Text>

          <View style={styles.field}>
            <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
              <Ionicons
                name="globe-outline"
                size={18}
                color={error ? COLORS.error : COLORS.gray}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputText}
                placeholder="votre-organisation.usekollecta.com"
                placeholderTextColor={COLORS.gray}
                value={domain}
                onChangeText={(v) => {
                  setDomain(v);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Continuer</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  field: { marginBottom: SPACING.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    height: 52,
  },
  inputRowError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff8f8',
  },
  inputIcon: { marginRight: 9 },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.darkGray,
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
    marginLeft: 2,
  },
  errorText: { fontSize: 12, color: COLORS.error, flex: 1 },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
