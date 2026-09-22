import React, { useEffect, useRef, useState } from 'react';
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
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useAuthStore } from '../../stores/auth.store';

const OTP_LENGTH = 6;

export default function LoginOtpScreen() {
  const params = useLocalSearchParams<{
    pendingLoginId: string;
    channel: 'sms' | 'email';
    deliveredTo: string;
    expiresAt: string;
    resendIn: string;
  }>();

  const [pendingLoginId, setPendingLoginId] = useState(
    String(params.pendingLoginId ?? ''),
  );
  const [deliveredTo, setDeliveredTo] = useState(
    String(params.deliveredTo ?? ''),
  );
  const [channel] = useState<'sms' | 'email'>(
    (params.channel as 'sms' | 'email') ?? 'sms',
  );

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(
    Number(params.resendIn ?? 30),
  );
  const inputRef = useRef<TextInput>(null);

  const confirmLoginOtp = useAuthStore((s) => s.confirmLoginOtp);
  const resendLoginOtp = useAuthStore((s) => s.resendLoginOtp);

  // Resend cooldown — server-driven initial value, ticked client-side.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleVerify = async () => {
    Keyboard.dismiss();
    if (code.length !== OTP_LENGTH) {
      setError('Veuillez entrer les 6 chiffres du code');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await confirmLoginOtp(pendingLoginId, code);
      router.replace('/');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Code incorrect. Veuillez réessayer.';
      setError(msg);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 80);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const next = await resendLoginOtp(pendingLoginId);
      setPendingLoginId(next.pendingLoginId);
      setDeliveredTo(next.deliveredTo);
      setResendIn(next.resendAvailableInSeconds);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 80);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Impossible de renvoyer le code. Veuillez réessayer.',
      );
    } finally {
      setResending(false);
    }
  };

  const channelLabel =
    channel === 'sms' ? 'par SMS au' : 'par email à';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.darkGray} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <View style={styles.iconBg}>
              <Ionicons
                name={channel === 'sms' ? 'chatbubble-ellipses' : 'mail-open'}
                size={38}
                color={COLORS.primary}
              />
            </View>
          </View>

          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.description}>
            Un code à 6 chiffres a été envoyé {channelLabel}
            {'\n'}
            <Text style={styles.targetHighlight}>{deliveredTo}</Text>
          </Text>

          {/* Visible OTP cells with hidden TextInput overlay */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.otpRow}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.otpCell,
                  code.length === i && styles.otpCellActive,
                  code.length > i && styles.otpCellFilled,
                  error ? styles.otpCellError : null,
                ]}
              >
                <Text style={styles.otpDigit}>{code[i] ?? ''}</Text>
              </View>
            ))}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
                setCode(digits);
                setError('');
                if (digits.length === OTP_LENGTH) Keyboard.dismiss();
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              style={styles.otpHiddenInput}
              accessibilityLabel="Code OTP à 6 chiffres"
            />
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (code.length !== OTP_LENGTH || verifying) &&
                styles.verifyBtnDisabled,
            ]}
            onPress={handleVerify}
            disabled={code.length !== OTP_LENGTH || verifying}
            activeOpacity={0.82}
          >
            {verifying ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.verifyBtnText}>Se connecter</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={COLORS.white}
                />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.resendSection}>
            {resendIn > 0 ? (
              <Text style={styles.timerText}>
                Renvoyer le code dans{' '}
                <Text style={styles.timerCount}>
                  {String(Math.floor(resendIn / 60)).padStart(2, '0')}:
                  {String(resendIn % 60).padStart(2, '0')}
                </Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resending}
                activeOpacity={0.7}
                style={styles.resendBtn}
              >
                {resending ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.resendText}>Renvoyer le code</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.backToLoginBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Ionicons
              name="arrow-back-circle-outline"
              size={17}
              color={COLORS.gray}
            />
            <Text style={styles.backToLoginText}>
              Modifier les identifiants
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },

  backBtn: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrap: { marginTop: SPACING.xl, marginBottom: SPACING.lg },
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
  },
  targetHighlight: {
    color: COLORS.darkGray,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 0.78,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  otpCellActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff1f1',
  },
  otpCellFilled: {
    borderColor: COLORS.darkGray,
    backgroundColor: COLORS.white,
  },
  otpCellError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff8f8',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGray,
    fontVariant: ['tabular-nums'],
  },
  otpHiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: SPACING.md,
  },
  errorText: { fontSize: 13, color: COLORS.error, textAlign: 'center' },

  verifyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  resendSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  resendText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  timerText: { fontSize: 13, color: COLORS.gray },
  timerCount: { color: COLORS.primary, fontWeight: '700' },

  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  backToLoginText: { fontSize: 13, color: COLORS.gray },
});
