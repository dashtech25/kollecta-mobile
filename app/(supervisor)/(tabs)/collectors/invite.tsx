import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api-client';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { CountryPicker } from '../../../../components/ui/CountryPicker';
import { Country, DEFAULT_COUNTRY } from '../../../../constants/countries';
import {
  COLORS,
  NEUTRAL,
  SPACING,
  BORDER_RADIUS,
} from '../../../../constants/theme';

interface InvitePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface InviteResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  mailDelivered: boolean;
}

export default function InviteCollectorScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Partial<InvitePayload>>({});
  const [success, setSuccess] = useState<InviteResponse | null>(null);

  const queryClient = useQueryClient();

  const inviteMutation = useMutation<InviteResponse, any, InvitePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/users/invite-collector', payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'collectors'] });
    },
  });

  const validate = (): { ok: boolean; payload: InvitePayload } => {
    const next: Partial<InvitePayload> = {};
    if (!firstName.trim()) next.firstName = 'Prénom requis';
    if (!lastName.trim()) next.lastName = 'Nom requis';
    if (!email.trim()) {
      next.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Adresse email invalide';
    }
    const phoneDigits = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!phoneDigits) {
      next.phone = 'Numéro requis';
    } else if (phoneDigits.length < 6) {
      next.phone = 'Numéro trop court';
    }
    setErrors(next);
    return {
      ok: Object.keys(next).length === 0,
      payload: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: `${country.dialCode}${phoneDigits}`,
      },
    };
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const { ok, payload } = validate();
    if (!ok) return;
    try {
      const result = await inviteMutation.mutateAsync(payload);
      setSuccess(result);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "L'invitation n'a pas pu être envoyée. Veuillez réessayer.";
      Alert.alert('Erreur', String(msg));
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setCountry(DEFAULT_COUNTRY);
    setSuccess(null);
    setErrors({});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="arrow-back" size={20} color={NEUTRAL.ink} />
            </TouchableOpacity>
            <View style={styles.topBarMeta}>
              <Text style={styles.topBarOver}>Équipe terrain</Text>
              <Text style={styles.topBarTitle}>Inviter un collecteur</Text>
            </View>
            <View style={{ width: 42 }} />
          </View>

          {success ? (
            <SuccessPanel
              email={success.user.email}
              firstName={success.user.firstName}
              mailDelivered={success.mailDelivered}
              onAddAnother={resetForm}
              onDone={() => router.back()}
            />
          ) : (
            <>
              {/* Hero */}
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
                  <Text style={styles.heroLabel}>Nouveau collecteur</Text>
                  <Text style={styles.heroTitle}>
                    Identifiants par email
                  </Text>
                  <Text style={styles.heroSub}>
                    Un mot de passe temporaire sera envoyé automatiquement à
                    l'adresse renseignée. Le collecteur pourra le changer
                    après sa première connexion.
                  </Text>
                </View>
                <View style={styles.heroIconWrap}>
                  <Ionicons
                    name="mail-open"
                    size={48}
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
              </View>

              {/* Form */}
              <View style={styles.row}>
                <FormField
                  label="Prénom"
                  required
                  icon="person-outline"
                  value={firstName}
                  onChangeText={(v) => {
                    setFirstName(v);
                    if (errors.firstName) setErrors((e) => ({ ...e, firstName: undefined }));
                  }}
                  error={errors.firstName}
                  autoCapitalize="words"
                  containerStyle={{ flex: 1 }}
                />
                <View style={{ width: 10 }} />
                <FormField
                  label="Nom"
                  required
                  icon="person-outline"
                  value={lastName}
                  onChangeText={(v) => {
                    setLastName(v);
                    if (errors.lastName) setErrors((e) => ({ ...e, lastName: undefined }));
                  }}
                  error={errors.lastName}
                  autoCapitalize="characters"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <FormField
                label="Adresse email"
                required
                icon="mail-outline"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                error={errors.email}
                placeholder="prenom.nom@creainvest.com"
                keyboardType="email-address"
                autoCapitalize="none"
                hint="Reçoit le mot de passe temporaire et les codes de connexion."
              />

              <Text style={styles.fieldLabelStandalone}>
                Téléphone <Text style={styles.requiredTag}>requis</Text>
              </Text>
              <View
                style={[
                  styles.phoneRow,
                  errors.phone ? styles.fieldRowError : null,
                ]}
              >
                <CountryPicker value={country} onChange={setCountry} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="6 90 00 00 00"
                  placeholderTextColor={NEUTRAL.inkSoft}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                  }}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={13} color={COLORS.error} />
                  <Text style={styles.errorText}>{errors.phone}</Text>
                </View>
              ) : null}

              <View style={styles.infoBanner}>
                <View style={styles.infoIcon}>
                  <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
                </View>
                <Text style={styles.infoText}>
                  Le collecteur sera créé dans votre branche avec le rôle{' '}
                  <Text style={{ fontWeight: '700' }}>Collecteur</Text>.
                  Vous pourrez ensuite lui assigner des zones depuis sa fiche.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  inviteMutation.isPending && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={inviteMutation.isPending}
                activeOpacity={0.85}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator color={NEUTRAL.inkOnFill} />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane"
                      size={16}
                      color={NEUTRAL.inkOnFill}
                    />
                    <Text style={styles.submitBtnText}>
                      Envoyer l'invitation
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function SuccessPanel({
  email,
  firstName,
  mailDelivered,
  onAddAnother,
  onDone,
}: {
  email: string;
  firstName: string;
  mailDelivered: boolean;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <View style={styles.successHero}>
        <DecorBg
          variant="rings"
          anchor="bottom-right"
          color="#FFFFFF"
          opacity={0.1}
          width={220}
          height={220}
        />
        <View style={styles.successCheck}>
          <Ionicons name="checkmark" size={36} color="#2E7D32" />
        </View>
        <Text style={styles.successTitle}>Invitation envoyée</Text>
        <Text style={styles.successSub}>
          {firstName} pourra se connecter dès réception du mot de passe
          temporaire.
        </Text>
        <View style={styles.successDivider} />
        <Text style={styles.successFooter}>
          {mailDelivered
            ? `Email envoyé à ${email}`
            : `L'envoi a échoué — copiez les identifiants depuis les logs et transmettez-les manuellement à ${firstName}.`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { marginBottom: 12 }]}
        onPress={onAddAnother}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add" size={16} color={NEUTRAL.inkOnFill} />
        <Text style={styles.submitBtnText}>Inviter un autre collecteur</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onDone} activeOpacity={0.7}>
        <Text style={styles.cancelBtnText}>Retour à la liste</Text>
      </TouchableOpacity>
    </>
  );
}

function FormField({
  label,
  required,
  icon,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType,
  autoCapitalize,
  hint,
  containerStyle,
}: {
  label: string;
  required?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
  containerStyle?: any;
}) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredTag}>requis</Text>}
      </Text>
      <View style={[styles.fieldRow, error ? styles.fieldRowError : null]}>
        <Ionicons
          name={icon}
          size={16}
          color={error ? COLORS.error : NEUTRAL.inkSoft}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={NEUTRAL.inkSoft}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NEUTRAL.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    gap: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NEUTRAL.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NEUTRAL.border,
  },
  topBarMeta: { flex: 1 },
  topBarOver: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginTop: 1,
  },

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
  heroTitle: {
    color: NEUTRAL.inkOnFill,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 6,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  heroIconWrap: { width: 80, alignItems: 'center', justifyContent: 'center' },

  row: { flexDirection: 'row' },

  fieldWrap: { marginBottom: SPACING.md },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: NEUTRAL.ink,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  fieldLabelStandalone: {
    fontSize: 12,
    fontWeight: '700',
    color: NEUTRAL.ink,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  requiredTag: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: NEUTRAL.borderSoft,
  },
  fieldRowError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff8f8',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: NEUTRAL.ink,
    padding: 0,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.md,
    height: 50,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: 4,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: NEUTRAL.ink,
    paddingHorizontal: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  errorText: { fontSize: 11, color: COLORS.error, flex: 1 },
  hint: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 5 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff1f1',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#fde0e0',
    marginVertical: SPACING.md,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde0e0',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: NEUTRAL.ink,
    lineHeight: 16,
  },

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
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, color: NEUTRAL.inkSoft, fontWeight: '500' },

  successHero: {
    backgroundColor: '#2E7D32',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  successCheck: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  successSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    textAlign: 'center',
  },
  successDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  successFooter: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});
