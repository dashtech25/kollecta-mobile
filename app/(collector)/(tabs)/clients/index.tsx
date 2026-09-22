import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../../../../hooks/useClients';
import { Client } from '../../../../types/client.types';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

type Filter = 'ALL' | 'ACTIVE' | 'WITH_BALANCE';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'Tout' },
  { key: 'ACTIVE', label: 'Actifs' },
  { key: 'WITH_BALANCE', label: 'Avec solde' },
];

export default function ClientsListScreen() {
  const { data: clients, isLoading, refetch, isFetching } = useClients();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  // Defensive: coerce balance to a real number in case any cached / stale
  // response came over the wire as a Decimal string.
  const normalized = useMemo(
    () => (clients ?? []).map((c) => ({ ...c, balance: Number(c.balance) || 0 })),
    [clients],
  );

  const filtered = useMemo(() => {
    let list = normalized;
    if (filter === 'ACTIVE') list = list.filter((c) => c.isActive);
    if (filter === 'WITH_BALANCE') list = list.filter((c) => c.balance > 0);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((c) => {
        const name = `${c.firstName} ${c.lastName}`.toLowerCase();
        return (
          name.includes(term) ||
          c.phone.toLowerCase().includes(term) ||
          c.zone?.name?.toLowerCase().includes(term)
        );
      });
    }
    // Sort by balance desc by default
    return [...list].sort((a, b) => b.balance - a.balance);
  }, [normalized, search, filter]);

  const totals = useMemo(() => {
    return {
      count: normalized.length,
      totalBalance: normalized.reduce((sum, c) => sum + c.balance, 0),
      active: normalized.filter((c) => c.isActive).length,
    };
  }, [normalized]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Custom header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mes clients</Text>
          <Text style={styles.headerSub}>
            {totals.count} {totals.count > 1 ? 'inscrits' : 'inscrit'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(collector)/(tabs)/clients/add')}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un client"
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ClientCard client={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={NEUTRAL.ink}
          />
        }
        ListHeaderComponent={
          <ListHeader
            totals={totals}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            visibleCount={filtered.length}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={NEUTRAL.ink} />
            </View>
          ) : (
            <EmptyState search={search} filter={filter} />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function ListHeader({
  totals,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  visibleCount,
}: {
  totals: { count: number; totalBalance: number; active: number };
  search: string;
  onSearchChange: (v: string) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  visibleCount: number;
}) {
  return (
    <View>
      {/* Hero summary card */}
      <View style={styles.summaryCard}>
        <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={180} height={180} />
        <DecorBg variant="dots" anchor="top-right" color="#FFFFFF" opacity={0.06} width={100} height={70} />

        <Text style={styles.summaryLabel}>Encours sous gestion</Text>
        <Text style={styles.summaryAmount}>{fmtAmount(totals.totalBalance)}</Text>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryStatsRow}>
          <SummaryStat label="Clients" value={String(totals.count)} />
          <View style={styles.summaryStatSep} />
          <SummaryStat label="Actifs" value={String(totals.active)} />
          <View style={styles.summaryStatSep} />
          <SummaryStat
            label="Avg / client"
            value={
              totals.count > 0
                ? fmtCompact(totals.totalBalance / totals.count) + ' FCFA'
                : '—'
            }
          />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={NEUTRAL.inkSoft} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client, téléphone, zone…"
          placeholderTextColor={NEUTRAL.inkSoft}
          value={search}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Rechercher un client"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
          >
            <Ionicons name="close-circle" size={16} color={NEUTRAL.inkSoft} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View
        style={styles.filterRow}
        accessibilityRole="tablist"
        accessibilityLabel="Filtrer les clients"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onFilterChange(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ flex: 1 }} />
        <Text style={styles.resultCount}>
          {visibleCount} {visibleCount > 1 ? 'résultats' : 'résultat'}
        </Text>
      </View>
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStatItem}>
      <Text style={styles.summaryStatValue}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
}

function ClientCard({ client, index }: { client: Client; index: number }) {
  const initials = `${client.firstName[0] ?? ''}${client.lastName[0] ?? ''}`.toUpperCase();
  const balance = Number(client.balance) || 0;
  const isInactive = !client.isActive;
  const isHighValue = balance >= 100_000;
  const isZeroBalance = balance === 0;
  // Subtle decorative variation: sprinkle dots on every 3rd card
  const showDecor = index % 3 === 1;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.clientCard,
        isInactive && styles.clientCardInactive,
        pressed && styles.clientCardPressed,
      ]}
      onPress={() => router.push(`/(collector)/(tabs)/clients/${client.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${client.firstName} ${client.lastName}, solde ${fmtAmount(balance)}${
        isInactive ? ', compte inactif' : ''
      }`}
    >
      {showDecor && (
        <DecorBg
          variant="dots"
          anchor="top-right"
          color={COLORS.primary}
          opacity={0.07}
          width={80}
          height={60}
        />
      )}

      {/* Left accent strip — only when client is inactive */}
      {isInactive && <View style={styles.cardAccent} />}

      {/* Avatar with subtle inner ring + status indicator */}
      <View style={styles.avatarWrap}>
        <View style={[styles.clientAvatar, isInactive && styles.clientAvatarInactive]}>
          <Text style={[styles.clientAvatarText, isInactive && styles.clientAvatarTextInactive]}>
            {initials}
          </Text>
        </View>
        {!isInactive && isHighValue && <View style={styles.avatarStar} />}
      </View>

      {/* Meta */}
      <View style={styles.clientMeta}>
        <Text
          style={[styles.clientName, isInactive && styles.clientNameInactive]}
          numberOfLines={1}
        >
          {client.firstName} {client.lastName}
        </Text>

        <View style={styles.clientSubRow}>
          {client.zone?.name ? (
            <View style={styles.subPill}>
              <Ionicons name="location-outline" size={10} color={NEUTRAL.inkMid} />
              <Text style={styles.subPillText}>{client.zone.name}</Text>
            </View>
          ) : null}
          <View style={styles.subPill}>
            <Ionicons name="call-outline" size={10} color={NEUTRAL.inkMid} />
            <Text style={styles.subPillText}>{client.phone}</Text>
          </View>
          {isInactive && (
            <View style={styles.inactivePill}>
              <Text style={styles.inactivePillText}>Inactif</Text>
            </View>
          )}
        </View>
      </View>

      {/* Balance + chevron */}
      <View style={styles.clientRight}>
        <Text
          style={[
            styles.balanceAmount,
            isInactive && styles.balanceAmountInactive,
            isZeroBalance && styles.balanceAmountZero,
          ]}
          numberOfLines={1}
        >
          {fmtCompact(balance)}
        </Text>
        <Text style={styles.balanceCurrency}>FCFA</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={NEUTRAL.inkSoft}
        style={styles.chev}
      />
    </Pressable>
  );
}


function EmptyState({ search, filter }: { search: string; filter: Filter }) {
  let title = 'Aucun client pour le moment';
  let desc = 'Touchez le bouton + pour ajouter votre premier client.';
  if (search.length > 0) {
    title = `Aucun résultat pour « ${search} »`;
    desc = 'Essayez un autre nom, téléphone ou zone.';
  } else if (filter !== 'ALL') {
    title = filter === 'ACTIVE' ? 'Aucun client actif' : 'Aucun client avec solde';
    desc = 'Modifiez le filtre pour voir plus de clients.';
  }
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="people-outline" size={24} color={NEUTRAL.inkSoft} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
    </View>
  );
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NEUTRAL.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NEUTRAL.ink,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  // List container
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Summary hero card
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    color: NEUTRAL.inkOnFill,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStatItem: {
    flex: 1,
  },
  summaryStatValue: {
    color: NEUTRAL.inkOnFill,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  summaryStatSep: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 10,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: NEUTRAL.ink,
    paddingVertical: 0,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: NEUTRAL.fill,
    borderColor: NEUTRAL.fill,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
  },
  chipTextActive: {
    color: NEUTRAL.inkOnFill,
  },
  resultCount: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
  },

  // ── Client card ──
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.025,
    shadowRadius: 3,
    elevation: 1,
  },
  clientCardPressed: {
    backgroundColor: NEUTRAL.surfaceAlt,
    transform: [{ scale: 0.985 }],
  },
  clientCardInactive: {
    backgroundColor: NEUTRAL.surfaceAlt,
    borderColor: NEUTRAL.borderSoft,
  },

  // Inactive accent strip on the very left edge of the card
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: NEUTRAL.borderStrong,
    opacity: 0.35,
  },

  // Avatar
  avatarWrap: {
    position: 'relative',
  },
  clientAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: NEUTRAL.surface,
    // inner ring effect
    shadowColor: NEUTRAL.borderStrong,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  clientAvatarInactive: {
    backgroundColor: NEUTRAL.borderSoft,
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: NEUTRAL.ink,
    letterSpacing: 0.6,
  },
  clientAvatarTextInactive: {
    color: NEUTRAL.inkSoft,
  },

  // High-value indicator: small dot on avatar
  avatarStar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: NEUTRAL.surface,
  },

  // Meta column
  clientMeta: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: NEUTRAL.ink,
    letterSpacing: -0.15,
  },
  clientNameInactive: {
    color: NEUTRAL.inkMid,
  },

  clientSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: NEUTRAL.surfaceSunken,
  },
  subPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: NEUTRAL.inkMid,
    letterSpacing: 0.1,
  },
  inactivePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: NEUTRAL.borderStrong,
    opacity: 0.7,
  },
  inactivePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: NEUTRAL.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  // Right column — balance + chevron
  clientRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  balanceAmountInactive: {
    color: NEUTRAL.inkSoft,
  },
  balanceAmountZero: {
    color: NEUTRAL.inkSoft,
    fontWeight: '600',
  },
  balanceCurrency: {
    fontSize: 10,
    fontWeight: '600',
    color: NEUTRAL.inkSoft,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  chev: {
    marginLeft: 2,
  },

  // Empty / loading
  empty: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
});
