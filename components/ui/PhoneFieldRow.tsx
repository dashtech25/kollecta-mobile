import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COUNTRIES,
  Country,
  DEFAULT_COUNTRY,
  findCountryByDialCode,
} from '../../constants/countries';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface PhoneFieldRowProps {
  /** UPPERCASE label shown above the input */
  label: string;
  /** Lucide-style ionicon shown in the leading 32×32 circle */
  icon: keyof typeof Ionicons.glyphMap;
  /** Full international number, e.g. "+237690000000" */
  value: string;
  /** Emits the recombined full international number */
  onChangeText: (next: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  /** First field in a section card (no top divider) */
  isFirst?: boolean;
}

/**
 * Phone-number input row with a country dial-code selector.
 *
 * - Defaults the country to **Cameroun (+237)** when value is empty.
 * - Parses the existing `value` to detect the country on mount and on
 *   external updates (e.g. edit-mode prefill).
 * - Emits a single combined string (`+CCNNNNNNNN`, no spaces) so the form
 *   state stays a flat record of phone numbers.
 *
 * Visually mirrors `FieldRow` from `ClientFormScreen` so it drops in
 * alongside the existing form fields without breaking rhythm.
 */
export function PhoneFieldRow({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  required,
  error,
  isFirst,
}: PhoneFieldRowProps) {
  const [country, setCountry] = useState<Country>(() => {
    return findCountryByDialCode(value) ?? DEFAULT_COUNTRY;
  });
  const [localNumber, setLocalNumber] = useState<string>(() => {
    if (!value) return '';
    const found = findCountryByDialCode(value);
    return found ? value.slice(found.dialCode.length) : value;
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  // Track our own emits so we can ignore the echo from React state propagation.
  const lastEmittedRef = useRef<string>(value);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    if (!value) {
      setLocalNumber('');
      return;
    }
    const found = findCountryByDialCode(value);
    if (found) {
      setCountry(found);
      setLocalNumber(value.slice(found.dialCode.length));
    } else {
      setLocalNumber(value);
    }
  }, [value]);

  const emit = (newCountry: Country, newLocal: string) => {
    const cleaned = newLocal.replace(/\s/g, '');
    const combined = cleaned ? `${newCountry.dialCode}${cleaned}` : '';
    lastEmittedRef.current = combined;
    onChangeText(combined);
  };

  const handleLocalChange = (next: string) => {
    setLocalNumber(next);
    emit(country, next);
  };

  const handleSelectCountry = (next: Country) => {
    setCountry(next);
    setPickerOpen(false);
    emit(next, localNumber);
  };

  return (
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={15} color={NEUTRAL.inkMid} />
      </View>
      <View style={styles.meta}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}>requis</Text>}
        </View>

        <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
          <TouchableOpacity
            style={styles.dialBtn}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Indicatif pays : ${country.name} ${country.dialCode}. Toucher pour modifier.`}
          >
            <Text style={styles.dialFlag}>{country.flag}</Text>
            <Text style={styles.dialCode}>{country.dialCode}</Text>
            <Ionicons name="chevron-down" size={11} color={NEUTRAL.inkSoft} />
          </TouchableOpacity>

          <View style={styles.dialDivider} />

          <TextInput
            style={styles.input}
            value={localNumber}
            onChangeText={handleLocalChange}
            placeholder={placeholder ?? '690 000 000'}
            placeholderTextColor={NEUTRAL.inkSoft}
            keyboardType="phone-pad"
            autoCorrect={false}
            accessibilityLabel={label}
          />
        </View>

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={12} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <CountryPickerModal
        visible={pickerOpen}
        selected={country}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectCountry}
      />
    </View>
  );
}

// ──────────────── Country picker modal ────────────────

function CountryPickerModal({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: Country;
  onClose: () => void;
  onSelect: (c: Country) => void;
}) {
  const [search, setSearch] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return COUNTRIES;
    return COUNTRIES.filter((c) => {
      return (
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.dialCode.includes(term)
      );
    });
  }, [search]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
      accessibilityViewIsModal
    >
      <View style={modalStyles.root}>
        <Animated.View style={[modalStyles.backdrop, { opacity: fadeAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer la liste des pays"
          />
        </Animated.View>

        <SafeAreaView edges={['bottom']} style={modalStyles.sheet}>
          <View style={modalStyles.handleZone} accessibilityElementsHidden importantForAccessibility="no">
            <View style={modalStyles.handle} />
          </View>

          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Choisir un pays</Text>
            <TouchableOpacity
              style={modalStyles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={20} color={NEUTRAL.ink} />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.searchBar}>
            <Ionicons name="search" size={16} color={NEUTRAL.inkSoft} />
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Rechercher un pays ou un indicatif…"
              placeholderTextColor={NEUTRAL.inkSoft}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Rechercher un pays"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
              >
                <Ionicons name="close-circle" size={16} color={NEUTRAL.inkSoft} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item.code === selected.code;
              return (
                <Pressable
                  style={({ pressed }) => [
                    modalStyles.row,
                    isSelected && modalStyles.rowSelected,
                    pressed && modalStyles.rowPressed,
                  ]}
                  onPress={() => onSelect(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${item.name}, indicatif ${item.dialCode}`}
                >
                  <Text style={modalStyles.rowFlag}>{item.flag}</Text>
                  <Text style={modalStyles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={modalStyles.rowDial}>{item.dialCode}</Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={COLORS.primary}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={modalStyles.empty}>
                <Text style={modalStyles.emptyText}>Aucun pays trouvé</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={modalStyles.divider} />}
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    gap: 10,
  },
  inputRowError: {
    borderBottomColor: COLORS.error,
  },

  dialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  dialFlag: {
    fontSize: 16,
  },
  dialCode: {
    fontSize: 14,
    fontWeight: '600',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  dialDivider: {
    width: 1,
    height: 16,
    backgroundColor: NEUTRAL.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: NEUTRAL.ink,
    paddingVertical: 4,
    fontWeight: '500',
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
});

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 18, 17, 0.55)',
  },
  sheet: {
    backgroundColor: NEUTRAL.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
    minHeight: '60%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  handleZone: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: NEUTRAL.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: NEUTRAL.ink,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NEUTRAL.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NEUTRAL.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    marginHorizontal: SPACING.lg,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: NEUTRAL.ink,
    paddingVertical: 0,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    backgroundColor: NEUTRAL.surface,
  },
  rowSelected: {
    backgroundColor: '#fff5f5',
  },
  rowPressed: {
    backgroundColor: NEUTRAL.surfaceAlt,
  },
  rowFlag: {
    fontSize: 22,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    color: NEUTRAL.ink,
    fontWeight: '600',
  },
  rowDial: {
    fontSize: 13,
    color: NEUTRAL.inkMid,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: NEUTRAL.borderSoft,
    marginLeft: SPACING.lg + 22 + 12,
  },
  empty: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: NEUTRAL.inkSoft,
  },
});
