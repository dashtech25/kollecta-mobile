import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import apiClient from '../../services/api-client';

const OTP_LENGTH = 6;
const RESEND_DELAY = 60;

export default function OtpVerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    setError('');
    // Handle paste of multiple digits
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const newDigits = [...digits];
      cleaned.slice(0, OTP_LENGTH - index).split('').forEach((d, i) => {
        newDigits[index + i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(index + cleaned.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    if (cleaned.length === 0 && value !== '') return; // non-digit character typed
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  const handleKeyPress = useCallback((index: number, key: string) => {
    if (key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  }, [digits]);

  const otpCode = digits.join('');
  const isComplete = otpCode.length === OTP_LENGTH && digits.every(Boolean);

  const handleVerify = async () => {
    if (!isComplete) {
      setError('Veuillez entrer les 6 chiffres du code');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/verify-otp', {
        email,
        otp: otpCode,
      });
      const result = data.data || data;
      router.push({
        pathname: '/(auth)/reset-password',
        params: { resetToken: result.resetToken, email },
      });
    } catch (err: any) {
      let msg = 'Code incorrect. Veuillez réessayer.';
      if (err.response?.data?.message) msg = err.response.data.message;
      setError(msg);
      // Shake effect: reset digits on wrong code
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setDigits(Array(OTP_LENGTH).fill(''));
      setError('');
      setTimer(RESEND_DELAY);
      setCanResend(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setError('Impossible de renvoyer le code. Veuillez réessayer.');
    } finally {
      setResendLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(b.length, 3)) + c)
    : '';

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
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.darkGray} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconBg}>
              <Ionicons name="shield-checkmark-outline" size={38} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.description}>
            Un code à 6 chiffres a été envoyé à{'\n'}
            <Text style={styles.emailHighlight}>{maskedEmail}</Text>
          </Text>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  error ? styles.otpBoxError : null,
                ]}
                value={digit}
                onChangeText={(v) => handleDigitChange(index, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH} // allows paste detection
                selectTextOnFocus
                textAlign="center"
                caretHidden
              />
            ))}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="close-circle-outline" size={15} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (!isComplete || loading) && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!isComplete || loading}
            activeOpacity={0.82}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.verifyBtnText}>Vérifier le code</Text>
                <Ionicons name="checkmark-circle-outline" size={19} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendSection}>
            {canResend ? (
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={resendLoading}
                activeOpacity={0.7}
              >
                {resendLoading ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.resendText}>Renvoyer le code</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Renvoyer le code dans{' '}
                <Text style={styles.timerCount}>
                  {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
                </Text>
              </Text>
            )}
          </View>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.backToLoginBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Ionicons name="arrow-back-circle-outline" size={17} color={COLORS.gray} />
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

  iconWrap: {
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
  },
  emailHighlight: {
    color: COLORS.darkGray,
    fontWeight: '600',
  },

  // OTP boxes
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    justifyContent: 'center',
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fafafa',
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff1f1',
    color: COLORS.primary,
  },
  otpBoxError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff8f8',
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    textAlign: 'center',
  },

  // Verify button
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

  // Resend
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
  resendText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  timerCount: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  backToLoginText: {
    fontSize: 13,
    color: COLORS.gray,
  },
});
