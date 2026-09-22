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
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import apiClient from '../../services/api-client';

const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
const STRENGTH_COLORS = ['#e5e7eb', '#ef4444', '#f59e0b', '#22c55e', '#16a34a'];

function getStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

export default function ResetPasswordScreen() {
  const { resetToken } = useLocalSearchParams<{ resetToken: string; email: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getStrength(password);

  const validate = () => {
    let valid = true;
    setPasswordError('');
    setConfirmError('');
    if (!password) {
      setPasswordError('Veuillez entrer un nouveau mot de passe');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Le mot de passe doit comporter au moins 8 caractères');
      valid = false;
    }
    if (!confirm) {
      setConfirmError('Veuillez confirmer le mot de passe');
      valid = false;
    } else if (password !== confirm) {
      setConfirmError('Les mots de passe ne correspondent pas');
      valid = false;
    }
    return valid;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        resetToken,
        newPassword: password,
      });
      setSuccess(true);
    } catch (err: any) {
      let msg = 'Une erreur est survenue. Veuillez réessayer.';
      if (err.response?.data?.message) msg = err.response.data.message;
      setPasswordError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.successScreen}>
          <View style={styles.successIconBg}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Mot de passe réinitialisé !</Text>
          <Text style={styles.successDesc}>
            Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.
          </Text>
          <TouchableOpacity
            style={styles.goLoginBtn}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.82}
          >
            <Text style={styles.goLoginText}>Se connecter</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              <Ionicons name="lock-open-outline" size={38} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.description}>
            Choisissez un mot de passe sécurisé d'au moins 8 caractères.
          </Text>

          {/* New password */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
            <View style={[styles.inputRow, passwordError ? styles.inputRowError : null]}>
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
                onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
                secureTextEntry={!showPassword}
                autoCorrect={false}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}

            {/* Strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            strength >= level ? STRENGTH_COLORS[strength] : COLORS.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                  {STRENGTH_LABELS[strength]}
                </Text>
              </View>
            )}

            {/* Requirements hint */}
            {password.length > 0 && strength < 3 && (
              <View style={styles.hintBox}>
                <Text style={styles.hintTitle}>Pour un mot de passe fort :</Text>
                <HintRow met={password.length >= 8} text="Au moins 8 caractères" />
                <HintRow met={/[A-Z]/.test(password)} text="Au moins une majuscule" />
                <HintRow met={/[0-9]/.test(password)} text="Au moins un chiffre" />
                <HintRow met={/[^A-Za-z0-9]/.test(password)} text="Au moins un caractère spécial" />
              </View>
            )}
          </View>

          {/* Confirm password */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Confirmer le mot de passe</Text>
            <View style={[styles.inputRow, confirmError ? styles.inputRowError : null]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={confirmError ? COLORS.error : COLORS.gray}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputText}
                placeholder="••••••••"
                placeholderTextColor={COLORS.gray}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setConfirmError(''); }}
                secureTextEntry={!showConfirm}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleReset}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((s) => !s)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
            </View>
            {confirmError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
                <Text style={styles.errorText}>{confirmError}</Text>
              </View>
            ) : confirm && confirm === password ? (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle-outline" size={13} color={COLORS.success} />
                <Text style={styles.matchText}>Les mots de passe correspondent</Text>
              </View>
            ) : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.resetBtn, loading && styles.resetBtnDisabled]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.resetBtnText}>Réinitialiser le mot de passe</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HintRow({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={hintRowStyles.row}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? COLORS.success : COLORS.gray}
      />
      <Text style={[hintRowStyles.text, met && hintRowStyles.textMet]}>{text}</Text>
    </View>
  );
}

const hintRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  text: { fontSize: 12, color: COLORS.gray },
  textMet: { color: COLORS.success },
});

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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },

  field: {
    marginBottom: SPACING.md,
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
  eyeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    flex: 1,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  matchText: {
    fontSize: 12,
    color: COLORS.success,
  },

  // Strength
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },

  hintBox: {
    marginTop: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 6,
  },

  // Reset button
  resetBtn: {
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
  resetBtnDisabled: {
    opacity: 0.65,
  },
  resetBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Success screen
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  successIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 12,
  },
  successDesc: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: SPACING.xxl,
  },
  goLoginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SPACING.xxl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  goLoginText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
