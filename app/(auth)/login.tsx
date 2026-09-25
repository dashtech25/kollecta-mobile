import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
import { useAuthStore } from '../../stores/auth.store';
import { CountryPicker } from '../../components/ui/CountryPicker';
import { Country, DEFAULT_COUNTRY } from '../../constants/countries';
import { clearTenantDomain, getTenantBranding, TenantBranding } from '../../services/tenant';

type LoginMode = 'email' | 'phone';

export default function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('phone');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  // National-format phone (no country code, no leading "+"). The full E.164
  // number is composed at submit time as `${country.dialCode}${digits}`.
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  useEffect(() => {
    getTenantBranding().then(setBranding);
  }, []);

  const requestLoginOtp = useAuthStore((s) => s.requestLoginOtp);

  const handleChangeOrganization = async () => {
    await clearTenantDomain();
    router.replace('/(auth)/select-organization');
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setIdentifierError('');
    setPasswordError('');
  };

  const validate = (): { ok: boolean; loginValue: string } => {
    let ok = true;
    setIdentifierError('');
    setPasswordError('');
    let loginValue = '';

    if (mode === 'email') {
      const trimmed = email.trim();
      if (!trimmed) {
        setIdentifierError('Veuillez entrer votre email');
        ok = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setIdentifierError('Adresse email invalide');
        ok = false;
      }
      loginValue = trimmed.toLowerCase();
    } else {
      const digits = phone.replace(/\D/g, '');
      if (!digits) {
        setIdentifierError('Veuillez entrer votre numéro');
        ok = false;
      } else if (digits.length < 6) {
        setIdentifierError('Numéro trop court');
        ok = false;
      }
      // Strip a leading 0 some users instinctively type before the national
      // number (e.g. "0690000000" instead of "690000000").
      const national = digits.replace(/^0+/, '');
      loginValue = `${country.dialCode}${national}`;
    }

    if (!password) {
      setPasswordError('Veuillez entrer votre mot de passe');
      ok = false;
    }

    return { ok, loginValue };
  };

  const handleSubmit = async () => {
    const { ok, loginValue } = validate();
    if (!ok) return;
    setLoading(true);
    try {
      const result = await requestLoginOtp(loginValue, password);
      if (!result.otpRequired) {
        // OTP désactivé côté serveur — la session est déjà ouverte.
        router.replace('/');
        return;
      }
      const { pending } = result;
      router.push({
        pathname: '/(auth)/login-otp',
        params: {
          pendingLoginId: pending.pendingLoginId,
          channel: pending.channel,
          deliveredTo: pending.deliveredTo,
          expiresAt: pending.expiresAt,
          resendIn: String(pending.resendAvailableInSeconds),
        },
      });
    } catch (error: any) {
      let msg = 'Identifiants incorrects. Veuillez réessayer.';
      if (error.response?.data?.message) {
        msg = error.response.data.message;
      } else if (error.code === 'ERR_NETWORK') {
        msg = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else if (error.message) {
        msg = error.message;
      }
      setPasswordError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.logoRing}>
              <Image
                source={
                  branding?.logoUrl
                    ? { uri: branding.logoUrl }
                    : require('../../assets/crea-invest-logo.png')
                }
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandLabel}>
              {(branding?.name || 'CREA INVEST').toUpperCase()}
            </Text>
            <Text style={styles.appName}>Collections</Text>
            <Text style={styles.heroTagline}>Votre espace de collecte sécurisé</Text>
            <TouchableOpacity
              onPress={handleChangeOrganization}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.changeOrgBtn}
            >
              <Text style={styles.changeOrgText}>Changer d'organisation</Text>
            </TouchableOpacity>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenue 👋</Text>
            <Text style={styles.cardSubtitle}>
              Choisissez votre méthode de connexion
            </Text>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => switchMode('phone')}
                style={[styles.tab, mode === 'phone' && styles.tabActive]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={mode === 'phone' ? COLORS.primary : COLORS.gray}
                />
                <Text
                  style={[
                    styles.tabText,
                    mode === 'phone' && styles.tabTextActive,
                  ]}
                >
                  Téléphone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => switchMode('email')}
                style={[styles.tab, mode === 'email' && styles.tabActive]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={mode === 'email' ? COLORS.primary : COLORS.gray}
                />
                <Text
                  style={[
                    styles.tabText,
                    mode === 'email' && styles.tabTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Identifier field */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {mode === 'email' ? 'Adresse email' : 'Numéro de téléphone'}
              </Text>
              {mode === 'email' ? (
                <View
                  style={[
                    styles.inputRow,
                    identifierError ? styles.inputRowError : null,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={identifierError ? COLORS.error : COLORS.gray}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputText}
                    placeholder="email@creainvest.com"
                    placeholderTextColor={COLORS.gray}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setIdentifierError('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              ) : (
                <View
                  style={[
                    styles.phoneRow,
                    identifierError ? styles.inputRowError : null,
                  ]}
                >
                  <CountryPicker value={country} onChange={setCountry} />
                  <TextInput
                    style={[styles.inputText, styles.phoneInput]}
                    placeholder="6 90 00 00 00"
                    placeholderTextColor={COLORS.gray}
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v);
                      setIdentifierError('');
                    }}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              )}
              {identifierError ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color={COLORS.error}
                  />
                  <Text style={styles.errorText}>{identifierError}</Text>
                </View>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Mot de passe</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputRow,
                  passwordError ? styles.inputRowError : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordError ? COLORS.error : COLORS.gray}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputText}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.gray}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color={COLORS.error}
                  />
                  <Text style={styles.errorText}>{passwordError}</Text>
                </View>
              ) : null}
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={COLORS.primary}
              />
              <Text style={styles.infoBannerText}>
                Un code de vérification vous sera envoyé pour finaliser la
                connexion.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/privacy-policy')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.footerLink}>
                  Politique de confidentialité
                </Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/terms')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.footerLink}>Conditions d'utilisation</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.copyright}>
              © {new Date().getFullYear()} Credit Africa Invest
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl + 8,
    paddingHorizontal: SPACING.lg,
  },
  logoRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: { width: 64, height: 64 },
  brandLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
  },
  appName: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 6,
  },
  changeOrgBtn: { marginTop: 14 },
  changeOrgText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    flex: 1,
    minHeight: 480,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.primary },

  // Fields
  field: { marginBottom: SPACING.md },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 7,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  forgotLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
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
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fafafa',
    height: 52,
    overflow: 'hidden',
  },
  phoneInput: { paddingHorizontal: 12 },
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
  eyeBtn: { padding: 4, marginLeft: 4 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    marginLeft: 2,
  },
  errorText: { fontSize: 12, color: COLORS.error, flex: 1 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff1f1',
    borderColor: '#fde0e0',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.darkGray,
    lineHeight: 16,
  },

  // Submit
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  footerLink: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  footerDot: { fontSize: 12, color: COLORS.gray },
  copyright: { fontSize: 11, color: COLORS.gray },
});
