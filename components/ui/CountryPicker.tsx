import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { COUNTRIES, Country } from '../../constants/countries';

interface CountryPickerProps {
  /** Currently selected country (uncontrolled-friendly: just pass a value). */
  value: Country;
  /** Called when the user picks a different country. */
  onChange: (next: Country) => void;
  /** Renders a compact pill instead of a full input row when true. */
  compact?: boolean;
}

/**
 * Tap-to-open country picker with searchable list. Used inside the phone
 * field so the user can swap dial codes without leaving the form.
 *
 * Implementation notes:
 *   - The trigger is a `Pressable` so it can sit inside another input row
 *     without stealing layout flexibility. `compact` shrinks it for use as
 *     a left adornment.
 *   - The modal uses a plain `Modal` (not a bottom-sheet lib) to keep the
 *     dependency footprint small. Searches are case- and accent-insensitive
 *     against the localized country name and the dial-code suffix.
 */
export function CountryPicker({ value, onChange, compact }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = normalize(query);
    return COUNTRIES.filter(
      (c) =>
        normalize(c.name).includes(q) ||
        c.dialCode.replace('+', '').includes(query.replace('+', '').trim()) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const handlePick = (country: Country) => {
    onChange(country);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, compact && styles.triggerCompact]}
        accessibilityRole="button"
        accessibilityLabel={`Sélectionner le pays. Actuel : ${value.name}, ${value.dialCode}`}
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dialCode}>{value.dialCode}</Text>
        <Ionicons name="chevron-down" size={14} color={COLORS.gray} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir un pays</Text>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color={COLORS.darkGray} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.gray} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un pays ou un indicatif…"
              placeholderTextColor={COLORS.gray}
              style={styles.searchInput}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.empty}>Aucun pays trouvé.</Text>
            }
            renderItem={({ item }) => {
              const selected = item.code === value.code;
              return (
                <TouchableOpacity
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => handlePick(item)}
                  activeOpacity={0.78}
                >
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowDial}>{item.dialCode}</Text>
                  </View>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    height: '100%',
  },
  triggerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 0,
  },
  flag: { fontSize: 18 },
  dialCode: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    fontVariant: ['tabular-nums'],
  },

  modal: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.darkGray },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.darkGray, padding: 0 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  rowSelected: { backgroundColor: '#fff1f1' },
  rowFlag: { fontSize: 24 },
  rowMeta: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: COLORS.darkGray },
  rowDial: {
    fontSize: 12,
    color: COLORS.gray,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.lg + 36,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.gray,
    paddingTop: SPACING.xl,
    fontSize: 13,
  },
});
