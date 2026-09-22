import React, { useEffect, useMemo, useState } from 'react';
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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCreateClient, useClient, useUpdateClient } from '../../hooks/useClients';
import { DecorBg } from '../ui/DecorBg';
import { PhoneFieldRow } from '../ui/PhoneFieldRow';
import { CreateClientPayload } from '../../types/client.types';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../constants/theme';

type Mode = 'create' | 'edit';

interface ClientFormScreenProps {
  mode: Mode;
  /** Required when mode === 'edit' */
  clientId?: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  orangeMoneyNumber: string;
  mtnMoneyNumber: string;
  idCardNumber: string;
  idCardPhoto: string | null;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  orangeMoneyNumber?: string;
  mtnMoneyNumber?: string;
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  orangeMoneyNumber: '',
  mtnMoneyNumber: '',
  idCardNumber: '',
  idCardPhoto: null,
};

export function ClientFormScreen({ mode, clientId }: ClientFormScreenProps) {
  const isEdit = mode === 'edit';

  const {
    data: existing,
    isLoading: loadingClient,
  } = useClient(isEdit && clientId ? clientId : '');

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient(clientId ?? '');
  const submitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasInitialized, setHasInitialized] = useState(!isEdit);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  useEffect(() => {
    if (isEdit && existing && !hasInitialized) {
      setForm({
        firstName: existing.firstName,
        lastName: existing.lastName,
        phone: existing.phone,
        email: existing.email ?? '',
        address: existing.address ?? '',
        orangeMoneyNumber: existing.orangeMoneyNumber ?? '',
        mtnMoneyNumber: existing.mtnMoneyNumber ?? '',
        idCardNumber: existing.idCardNumber ?? '',
        idCardPhoto: existing.idCardPhoto ?? null,
      });
      setHasInitialized(true);
    }
  }, [isEdit, existing, hasInitialized]);

  const initials = useMemo(() => {
    const fi = form.firstName[0] ?? '';
    const li = form.lastName[0] ?? '';
    return (fi + li).toUpperCase();
  }, [form.firstName, form.lastName]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    const phoneRegex = /^\+?\d[\d\s]{7,}$/;

    if (!form.firstName.trim()) next.firstName = 'Prénom requis';
    if (!form.lastName.trim()) next.lastName = 'Nom requis';
    if (!form.phone.trim()) {
      next.phone = 'Téléphone requis';
    } else if (!phoneRegex.test(form.phone.trim())) {
      next.phone = 'Numéro de téléphone invalide';
    }
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      next.email = 'Adresse email invalide';
    }
    if (form.orangeMoneyNumber.trim() && !phoneRegex.test(form.orangeMoneyNumber.trim())) {
      next.orangeMoneyNumber = 'Numéro Orange invalide';
    }
    if (form.mtnMoneyNumber.trim() && !phoneRegex.test(form.mtnMoneyNumber.trim())) {
      next.mtnMoneyNumber = 'Numéro MTN invalide';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload: CreateClientPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase() || undefined,
      address: form.address.trim() || undefined,
      orangeMoneyNumber: form.orangeMoneyNumber.trim() || undefined,
      mtnMoneyNumber: form.mtnMoneyNumber.trim() || undefined,
      idCardNumber: form.idCardNumber.trim() || undefined,
      idCardPhoto: form.idCardPhoto ?? undefined,
    };

    try {
      if (isEdit && clientId) {
        await updateMutation.mutateAsync(payload);
        Alert.alert('Modifié', 'Les informations du client ont été mises à jour.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await createMutation.mutateAsync(payload);
        Alert.alert('Client ajouté', 'Le client a été ajouté à votre portefeuille.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Une erreur est survenue. Veuillez réessayer.";
      Alert.alert('Erreur', String(msg));
    }
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    setPickingPhoto(true);
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          source === 'camera'
            ? "L'accès à l'appareil photo est nécessaire pour scanner la pièce d'identité."
            : "L'accès à la galerie est nécessaire pour importer une photo.",
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.6,
              base64: true,
              allowsEditing: true,
              aspect: [4, 3],
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.6,
              base64: true,
              allowsEditing: true,
              aspect: [4, 3],
            });

      if (result.canceled || !result.assets[0]?.base64) return;
      const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      update('idCardPhoto', dataUrl);
    } catch (e: any) {
      Alert.alert('Erreur', "Impossible d'importer la photo. Veuillez réessayer.");
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(
      "Photo de la pièce d'identité",
      "Choisissez une source",
      [
        { text: 'Prendre une photo', onPress: () => pickPhoto('camera') },
        { text: 'Galerie', onPress: () => pickPhoto('library') },
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Supprimer la photo ?',
      'La photo de la pièce d\'identité sera retirée du dossier client.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => update('idCardPhoto', null),
        },
      ],
    );
  };

  if (isEdit && loadingClient && !hasInitialized) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="Modifier le client"
          onBack={() => router.back()}
        />
        <View style={styles.center}>
          <ActivityIndicator color={NEUTRAL.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title={isEdit ? 'Modifier le client' : 'Nouveau client'}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar preview card */}
          <View style={styles.previewCard}>
            <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={200} height={200} />
            <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
            <View style={styles.previewAvatar}>
              <Text style={styles.previewAvatarText}>
                {initials || '+'}
              </Text>
            </View>
            <Text style={styles.previewName} numberOfLines={1}>
              {form.firstName || form.lastName
                ? `${form.firstName} ${form.lastName}`.trim()
                : 'Nouveau client'}
            </Text>
            <Text style={styles.previewSub} numberOfLines={1}>
              {form.phone || 'Téléphone'}
            </Text>
          </View>

          {/* Identité */}
          <SectionHeader
            label="Identité"
            hint="Informations principales du client"
          />
          <View style={styles.sectionCard}>
            <FieldRow
              label="Prénom"
              required
              icon="person-outline"
              value={form.firstName}
              onChangeText={(v) => update('firstName', v)}
              placeholder="Beatrice"
              autoCapitalize="words"
              error={errors.firstName}
              isFirst
            />
            <FieldRow
              label="Nom"
              required
              icon="person-outline"
              value={form.lastName}
              onChangeText={(v) => update('lastName', v)}
              placeholder="NDOM"
              autoCapitalize="words"
              error={errors.lastName}
            />
          </View>

          {/* Contact */}
          <SectionHeader
            label="Contact"
            hint="Permet d'appeler le client et lui envoyer des SMS"
          />
          <View style={styles.sectionCard}>
            <PhoneFieldRow
              label="Téléphone"
              required
              icon="call-outline"
              value={form.phone}
              onChangeText={(v) => update('phone', v)}
              error={errors.phone}
              isFirst
            />
            <FieldRow
              label="Email"
              icon="mail-outline"
              value={form.email}
              onChangeText={(v) => update('email', v)}
              placeholder="client@exemple.com (codes par email)"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <FieldRow
              label="Adresse"
              icon="location-outline"
              value={form.address}
              onChangeText={(v) => update('address', v)}
              placeholder="Rue, quartier (optionnel)"
              autoCapitalize="words"
            />
          </View>

          {/* Mobile Money — both providers can coexist */}
          <SectionHeader
            label="Mobile Money"
            hint="Le client peut posséder un numéro Orange, MTN, ou les deux"
          />
          <View style={styles.sectionCard}>
            <PhoneFieldRow
              label="Orange Money"
              icon="wallet-outline"
              value={form.orangeMoneyNumber}
              onChangeText={(v) => update('orangeMoneyNumber', v)}
              error={errors.orangeMoneyNumber}
              isFirst
            />
            <PhoneFieldRow
              label="MTN Mobile Money"
              icon="wallet-outline"
              value={form.mtnMoneyNumber}
              onChangeText={(v) => update('mtnMoneyNumber', v)}
              error={errors.mtnMoneyNumber}
            />
          </View>

          {/* Identification + KYC photo */}
          <SectionHeader
            label="Pièce d'identité"
            hint="Numéro de la CNI ou du passeport, et photo pour le KYC"
          />
          <View style={styles.sectionCard}>
            <FieldRow
              label="N° de pièce d'identité"
              icon="card-outline"
              value={form.idCardNumber}
              onChangeText={(v) => update('idCardNumber', v)}
              placeholder="123 456 789 (optionnel)"
              autoCapitalize="characters"
              isFirst
            />
            <KycPhotoRow
              photo={form.idCardPhoto}
              busy={pickingPhoto}
              onAdd={handleAddPhoto}
              onReplace={handleAddPhoto}
              onRemove={handleRemovePhoto}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky save bar */}
        <SafeAreaView edges={['bottom']} style={styles.saveBarSafe}>
          <View style={styles.saveBar}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Annuler"
            >
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={isEdit ? 'Enregistrer les modifications' : 'Enregistrer le client'}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isEdit ? 'checkmark-circle-outline' : 'add-circle-outline'}
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.saveBtnText}>
                    {isEdit ? 'Enregistrer' : 'Ajouter le client'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color={NEUTRAL.ink} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function SectionHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderLabel}>{label}</Text>
      {hint ? <Text style={styles.sectionHeaderHint}>{hint}</Text> : null}
    </View>
  );
}

interface FieldRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  isFirst?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function FieldRow({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  required,
  error,
  isFirst,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: FieldRowProps) {
  return (
    <View style={[styles.fieldRow, !isFirst && styles.fieldRowDivider]}>
      <View style={styles.fieldRowIcon}>
        <Ionicons name={icon} size={15} color={NEUTRAL.inkMid} />
      </View>
      <View style={styles.fieldRowMeta}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {required && <Text style={styles.fieldRequired}>requis</Text>}
        </View>
        <TextInput
          style={[styles.fieldInput, error ? styles.fieldInputError : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={NEUTRAL.inkSoft}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          accessibilityLabel={label}
        />
        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={12} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function KycPhotoRow({
  photo,
  busy,
  onAdd,
  onReplace,
  onRemove,
}: {
  photo: string | null;
  busy: boolean;
  onAdd: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.kycRow, styles.fieldRowDivider]}>
      <View style={styles.fieldRowIcon}>
        <Ionicons name="image-outline" size={15} color={NEUTRAL.inkMid} />
      </View>
      <View style={styles.fieldRowMeta}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>Photo de la pièce</Text>
          <Text style={styles.fieldHint}>KYC</Text>
        </View>

        {photo ? (
          <View style={styles.kycPhotoWrap}>
            <Image
              source={{ uri: photo }}
              style={styles.kycPhoto}
              accessibilityLabel="Aperçu de la photo de pièce d'identité"
            />
            <View style={styles.kycPhotoActions}>
              <TouchableOpacity
                style={styles.kycMiniBtn}
                onPress={onReplace}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Remplacer la photo"
              >
                <Ionicons name="refresh" size={14} color={NEUTRAL.ink} />
                <Text style={styles.kycMiniBtnText}>Remplacer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.kycMiniBtn, styles.kycMiniBtnDanger]}
                onPress={onRemove}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Supprimer la photo"
              >
                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                <Text style={[styles.kycMiniBtnText, { color: COLORS.error }]}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.kycPlaceholder}
            onPress={onAdd}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo de la pièce d'identité"
          >
            {busy ? (
              <ActivityIndicator color={NEUTRAL.ink} />
            ) : (
              <>
                <View style={styles.kycPlaceholderIcon}>
                  <Ionicons name="camera-outline" size={20} color={NEUTRAL.inkMid} />
                </View>
                <Text style={styles.kycPlaceholderTitle}>
                  Ajouter une photo
                </Text>
                <Text style={styles.kycPlaceholderHint}>
                  Capturer ou importer une photo de la CNI
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: NEUTRAL.bg },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: NEUTRAL.ink,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  // Preview hero
  previewCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  previewAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },
  previewAvatarText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  previewName: {
    color: NEUTRAL.inkOnFill,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  previewSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 3,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: NEUTRAL.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionHeaderHint: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },

  sectionCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },

  // Field row
  fieldRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
  },
  fieldRowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  fieldRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  fieldRowMeta: { flex: 1, minWidth: 0 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRequired: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldHint: {
    fontSize: 9,
    fontWeight: '700',
    color: NEUTRAL.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldInput: {
    fontSize: 15,
    color: NEUTRAL.ink,
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    fontWeight: '500',
  },
  fieldInputError: {
    borderBottomColor: COLORS.error,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    flex: 1,
  },

  // KYC photo row
  kycRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  kycPlaceholder: {
    marginTop: 6,
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: NEUTRAL.border,
    borderStyle: 'dashed',
    backgroundColor: NEUTRAL.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kycPlaceholderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kycPlaceholderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
  },
  kycPlaceholderHint: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
  },
  kycPhotoWrap: {
    marginTop: 8,
    gap: 8,
  },
  kycPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: NEUTRAL.surfaceSunken,
    resizeMode: 'cover',
  },
  kycPhotoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  kycMiniBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: NEUTRAL.surfaceAlt,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
  },
  kycMiniBtnDanger: {
    backgroundColor: '#fff5f5',
    borderColor: '#fde0e0',
  },
  kycMiniBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: NEUTRAL.ink,
  },

  // Sticky save bar
  saveBarSafe: {
    backgroundColor: NEUTRAL.surface,
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  saveBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.lg,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEUTRAL.surfaceSunken,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
