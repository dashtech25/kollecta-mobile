import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DecorBg } from '../../../../../components/ui/DecorBg';
import {
  useWithdrawal,
  useVerifyCodeAndComplete,
  useResendWithdrawalCode,
} from '../../../../../hooks/useWithdrawals';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import {
  COLORS,
  NEUTRAL,
  SPACING,
  BORDER_RADIUS,
} from '../../../../../constants/theme';

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

export default function VerifyCodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: withdrawal, isLoading } = useWithdrawal(id);
  const verifyCode = useVerifyCodeAndComplete();
  const resendCode = useResendWithdrawalCode();
  const [code, setCode] = useState('');
  const [sendToClient, setSendToClient] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Local countdown — driven by the server-supplied `nextResendInSeconds` and
  // ticked down each second until 0.
  const initialCooldown = withdrawal?.nextResendInSeconds ?? 0;
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    setCooldown(withdrawal?.nextResendInSeconds ?? 0);
  }, [withdrawal?.nextResendInSeconds, withdrawal?.smsLastSentAt]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resendDisabled = useMemo(() => {
    if (cooldown > 0) return true;
    if (resendCode.isPending) return true;
    if (!withdrawal) return true;
    const used = withdrawal.smsResendCount ?? 0;
    const max = withdrawal.maxResends ?? 5;
    return used >= max;
  }, [cooldown, resendCode.isPending, withdrawal]);

  if (isLoading || !withdrawal) return <LoadingSpinner />;

  const handleVerify = async () => {
    Keyboard.dismiss();
    if (code.length !== 6) {
      Alert.alert('Erreur', 'Le code doit contenir 6 chiffres');
      return;
    }
    try {
      await verifyCode.mutateAsync({ id, code, sendToClient });
      const momoMsg = sendToClient
        ? "\n\nL'argent sera envoyé sur le compte Mobile Money du client."
        : "\n\nL'argent est à votre disposition pour remise au client.";
      Alert.alert(
        'Retrait complété !',
        `${fmtAmount(withdrawal.amount)} retirés avec succès.${momoMsg}`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Code invalide ou expiré',
      );
      setCode('');
    }
  };

  const handleResend = async () => {
    try {
      await resendCode.mutateAsync(id);
      setCode('');
      Alert.alert(
        'Code renvoyé',
        `Un nouveau code a été envoyé à ${withdrawal.client?.firstName ?? 'le client'} par SMS.`,
      );
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.response?.data?.message ||
          "Impossible de renvoyer le code pour le moment.",
      );
    }
  };

  const used = withdrawal.smsResendCount ?? 0;
  const max = withdrawal.maxResends ?? 5;
  const cooldownLabel =
    cooldown >= 60
      ? `${Math.floor(cooldown / 60)}m ${String(cooldown % 60).padStart(2, '0')}s`
      : `${cooldown}s`;

  const providerName =
    withdrawal.momoProvider === 'ORANGE_MONEY' ? 'Orange Money' : 'MTN MoMo';

  return (
    <KeyboardAvoidingView
      style={styles.kavContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — amount + client */}
        <View style={styles.heroCard}>
          <DecorBg
            variant="rings"
            anchor="bottom-right"
            color="#FFFFFF"
            opacity={0.1}
            width={220}
            height={220}
          />
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Code SMS envoyé au client</Text>
            <Text style={styles.heroAmount}>{fmtAmount(withdrawal.amount)}</Text>
            <Text style={styles.heroSub}>
              {withdrawal.client?.firstName} {withdrawal.client?.lastName}
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons
              name="chatbubble-ellipses"
              size={50}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        </View>

        {/* OTP card */}
        <View style={styles.otpCard}>
          <Text style={styles.otpTitle}>Saisir le code communiqué</Text>
          <Text style={styles.otpSub}>
            Demandez au client de vous lire les 6 chiffres reçus par SMS.
          </Text>

          {/* The hidden TextInput receives the actual key events; the visible
              cells reflect each digit. Tapping anywhere inside the row
              re-focuses the input — same pattern as the deposit page. */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.otpRow}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.otpCell,
                  code.length === i && styles.otpCellActive,
                  code.length > i && styles.otpCellFilled,
                ]}
              >
                <Text style={styles.otpDigit}>{code[i] ?? ''}</Text>
              </View>
            ))}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(digits);
                if (digits.length === 6) Keyboard.dismiss();
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              style={styles.otpHiddenInput}
              accessibilityLabel="Code SMS à 6 chiffres"
            />
          </TouchableOpacity>

          {/* Resend block */}
          <View style={styles.resendRow}>
            <View style={styles.resendMeta}>
              <Text style={styles.resendLabel}>
                {used === 0 ? 'Pas reçu ?' : `Renvoyé ${used}/${max}`}
              </Text>
              <Text style={styles.resendHint}>
                {cooldown > 0
                  ? `Prochain renvoi dans ${cooldownLabel}`
                  : used >= max
                    ? 'Limite de renvois atteinte'
                    : 'Disponible immédiatement'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendDisabled}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={
                resendDisabled
                  ? `Renvoi indisponible, prochain dans ${cooldownLabel}`
                  : 'Renvoyer le code'
              }
            >
              {resendCode.isPending ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text
                  style={[
                    styles.resendBtnText,
                    resendDisabled && { color: NEUTRAL.inkSoft },
                  ]}
                >
                  {cooldown > 0 ? cooldownLabel : 'Renvoyer'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* MoMo send option — hidden for CASH withdrawals (no MoMo destination). */}
        {withdrawal.method === 'MOMO' && withdrawal.momoNumber ? (
          <View style={styles.momoOption}>
            <View style={styles.momoTextContainer}>
              <Text style={styles.momoLabel}>Envoyer via {providerName}</Text>
              <Text style={styles.momoDesc} numberOfLines={2}>
                Envoyer l'argent directement au {withdrawal.momoNumber}
              </Text>
            </View>
            <Switch
              value={sendToClient}
              onValueChange={setSendToClient}
              trackColor={{ true: COLORS.primary, false: NEUTRAL.border }}
              thumbColor={NEUTRAL.surface}
            />
          </View>
        ) : (
          <View style={styles.cashReminder}>
            <Ionicons name="cash" size={14} color="#2E7D32" />
            <Text style={styles.cashReminderText}>
              Mode espèces — vous remettrez l'argent en main propre.
            </Text>
          </View>
        )}

        {/* Validate */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (code.length !== 6 || verifyCode.isPending) &&
              styles.submitBtnDisabled,
          ]}
          onPress={handleVerify}
          disabled={code.length !== 6 || verifyCode.isPending}
          activeOpacity={0.85}
        >
          {verifyCode.isPending ? (
            <ActivityIndicator color={NEUTRAL.inkOnFill} />
          ) : (
            <>
              <Ionicons
                name="lock-open"
                size={16}
                color={NEUTRAL.inkOnFill}
              />
              <Text style={styles.submitBtnText}>
                Valider et compléter le retrait
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kavContainer: { flex: 1, backgroundColor: NEUTRAL.bg },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.md,
    paddingBottom: 120,
  },

  // Hero
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroLeft: { flex: 1 },
  heroLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: NEUTRAL.inkOnFill,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
  },
  heroIconWrap: { width: 80, alignItems: 'center', justifyContent: 'center' },

  // OTP card
  otpCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
  },
  otpTitle: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
  otpSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: NEUTRAL.borderSoft,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellActive: { borderColor: COLORS.primary, backgroundColor: '#fff1f1' },
  otpCellFilled: { borderColor: NEUTRAL.ink, backgroundColor: NEUTRAL.surface },
  otpDigit: {
    fontSize: 24,
    fontWeight: '800',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  otpHiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
  },

  // Resend
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  resendMeta: { flex: 1, marginRight: SPACING.sm },
  resendLabel: { fontSize: 12, fontWeight: '600', color: NEUTRAL.ink },
  resendHint: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  resendBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // MoMo option
  momoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
  },
  momoTextContainer: { flex: 1, marginRight: SPACING.sm },
  momoLabel: { fontSize: 13, fontWeight: '600', color: NEUTRAL.ink },
  momoDesc: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },

  // Cash-mode reminder shown in place of the Mobile-Money send toggle.
  cashReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: SPACING.md,
  },
  cashReminderText: {
    flex: 1,
    fontSize: 12,
    color: '#1B5E20',
    fontWeight: '500',
    lineHeight: 16,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
