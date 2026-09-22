import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import apiClient from '../../services/api-client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    setEmailError('');
    if (!email.trim()) {
      setEmailError('Veuillez entrer votre adresse email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Adresse email invalide');
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { email: email.trim().toLowerCase() },
      });
    } catch (error: any) {
      let msg = 'Une erreur est survenue. Veuillez réessayer.';
      if (error.response?.data?.message) {
        msg = error.response.data.message;
      } else if (error.code === 'ERR_NETWORK') {
        msg = 'Impossible de contacter le serveur.';
      }
      setEmailError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.darkGray} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconBg}>
              <Ionicons name="key-outline" size={38} color={COLORS.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Mot de passe oublié ?</Text>
          <Text style={styles.description}>
            Saisissez l'adresse email associée à votre compte. Si elle est reconnue, vous recevrez un code de vérification à 6 chiffres.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>Adresse email</Text>
            <View style={[styles.inputRow, emailError ? styles.inputRowError : null]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailError ? COLORS.error : COLORS.gray}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputText}
                placeholder="votre@email.com"
                placeholderTextColor={COLORS.gray}
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>
            {emailError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>Envoyer le code</Text>
                  <Ionicons name="send-outline" size={17} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.info} />
            <Text style={styles.infoText}>
              Le code est valable <Text style={styles.infoBold}>10 minutes</Text>. Vérifiez aussi vos spams.
            </Text>
          </View>

          {/* Back to login */}
          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back-circle-outline" size={17} color={COLORS.primary} />
            <Text style={styles.backToLoginText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  backBtn: {
    marginTop: SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrap: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  iconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fde0e0',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },

  form: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    height: 52,
    marginBottom: 4,
  },
  inputRowError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff8f8',
  },
  inputIcon: {
    marginRight: 9,
  },
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
    marginTop: 4,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    flex: 1,
  },

  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  sendBtnDisabled: {
    opacity: 0.65,
  },
  sendBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: 10,
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1d4ed8',
    lineHeight: 19,
  },
  infoBold: {
    fontWeight: '700',
  },

  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  backToLoginText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
