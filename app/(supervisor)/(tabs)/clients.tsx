import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useClients } from '../../../hooks/useClients';
import { DecorBg } from '../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { Client } from '../../../types/client.types';

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

export default function AllClientsScreen() {
  const { data: clients, isLoading, refetch, isFetching } = useClients();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const list: Client[] = clients ?? [];
  const totalCount = list.length;
  const activeCount = list.filter((c) => c.isActive).length;
  const totalBalance = list.reduce(
    (s, c) => s + (Number(c.balance) || 0),
    0,
  );
  const avgBalance = totalCount > 0 ? totalBalance / totalCount : 0;
  const activeRatio = totalCount > 0 ? activeCount / totalCount : 0;

  const filtered = useMemo(() => {
    let l = list;
    if (filter === 'ACTIVE') l = l.filter((c) => c.isActive);
    else if (filter === 'INACTIVE') l = l.filter((c) => !c.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter((c) =>
        `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(q),
      );
    }
    // Sort by balance desc to highlight top accounts
    return [...l].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
  }, [list, search, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={NEUTRAL.ink}
          />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.iconBtn}>
            <Ionicons name="person" size={20} color={NEUTRAL.ink} />
          </View>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Portefeuille</Text>
            <Text style={styles.topBarTitle}>Clients</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
          <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Encours total</Text>
            <View style={styles.heroAmountRow}>
              {isLoading ? (
                <ActivityIndicator color={NEUTRAL.inkOnFill} />
              ) : (
                <Text style={styles.heroAmount}>{fmtAmount(totalBalance)}</Text>
              )}
            </View>
            <Text style={styles.heroSub}>
              {totalCount} client{totalCount > 1 ? 's' : ''} ·{' '}
              {fmtCompact(avgBalance)} FCFA en moyenne
            </Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroFooterRow}>
              <View>
                <Text style={styles.heroFooterLabel}>Actifs</Text>
                <Text style={styles.heroFooterValue}>{activeCount}</Text>
              </View>
              <View style={styles.heroFooterDivider} />
              <View>
                <Text style={styles.heroFooterLabel}>Inactifs</Text>
                <Text style={styles.heroFooterValue}>
                  {totalCount - activeCount}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.heroArcWrap}>
            <ProgressArc
              ratio={activeRatio}
              size={104}
              strokeWidth={8}
              trackColor="rgba(255,255,255,0.15)"
              progressColor={NEUTRAL.inkOnFill}
            />
            <View style={styles.heroArcCenter} pointerEvents="none">
              <Text style={styles.heroArcPct}>
                {Math.round(activeRatio * 100)}%
              </Text>
              <Text style={styles.heroArcLabel}>actifs</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={NEUTRAL.inkSoft} />
          <TextInput
            placeholder="Nom, prénom ou téléphone…"
            placeholderTextColor={NEUTRAL.inkSoft}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={NEUTRAL.inkSoft} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {filtered.length === list.length
              ? 'Top portefeuille'
              : `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`}
          </Text>
          <View style={styles.filterRow}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => {
              const active = filter === f;
              const label = f === 'ALL' ? 'Tous' : f === 'ACTIVE' ? 'Actifs' : 'Inactifs';
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.78}
                >
                  <Text
                    style={[styles.filterText, active && styles.filterTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="person-outline" size={20} color={NEUTRAL.inkSoft} />
            </View>
            <Text style={styles.emptyTitle}>Aucun client</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'Essayez un autre mot-clé.' : 'Aucun client ne correspond à ce filtre.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((c, i) => (
              <Row key={c.id} item={c} isFirst={i === 0} />
            ))}
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function Row({ item, isFirst }: { item: Client; isFirst: boolean }) {
  const initials = `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      <View style={[styles.avatar, !item.isActive && styles.avatarInactive]}>
        <Text style={styles.avatarText}>{initials || '·'}</Text>
      </View>
      <View style={styles.rowMeta}>
        <View style={styles.rowNameRow}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.firstName} {item.lastName}
          </Text>
          {!item.isActive && (
            <View style={styles.inactiveChip}>
              <Text style={styles.inactiveChipText}>Inactif</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowSub} numberOfLines={1}>
          {item.phone}
          {item.collector
            ? ` · ${item.collector.firstName} ${item.collector.lastName}`
            : ''}
        </Text>
      </View>
      <View style={styles.balanceWrap}>
        <Text style={styles.balanceValue}>
          {fmtCompact(Number(item.balance) || 0)}
        </Text>
        <Text style={styles.balanceUnit}>FCFA</Text>
      </View>
    </View>
  );
}

function ProgressArc({
  ratio,
  size,
  strokeWidth,
  trackColor,
  progressColor,
}: {
  ratio: number;
  size: number;
  strokeWidth: number;
  trackColor: string;
  progressColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(ratio, 0), 1));
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="transparent" />
      <Circle
        cx={c}
        cy={c}
        r={radius}
        stroke={progressColor}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NEUTRAL.bg },
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
  topBarTitle: { fontSize: 17, fontWeight: '700', color: NEUTRAL.ink, marginTop: 1 },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
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
  heroLeft: { flex: 1, justifyContent: 'space-between' },
  heroLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroAmountRow: { minHeight: 44, justifyContent: 'center', marginTop: 6 },
  heroAmount: {
    color: NEUTRAL.inkOnFill,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10,
  },
  heroFooterRow: { flexDirection: 'row', alignItems: 'center' },
  heroFooterDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 14,
  },
  heroFooterLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroFooterValue: {
    color: NEUTRAL.inkOnFill,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  heroArcWrap: {
    width: 104,
    height: 104,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArcCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArcPct: {
    color: NEUTRAL.inkOnFill,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  heroArcLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: NEUTRAL.ink, padding: 0 },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: NEUTRAL.ink },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: BORDER_RADIUS.full,
    padding: 3,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  filterPillActive: { backgroundColor: NEUTRAL.surface },
  filterText: { fontSize: 11, color: NEUTRAL.inkMid, fontWeight: '600' },
  filterTextActive: { color: NEUTRAL.ink },

  list: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde0e0',
  },
  avatarInactive: { opacity: 0.5 },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  rowMeta: { flex: 1 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: {
    fontSize: 13,
    fontWeight: '600',
    color: NEUTRAL.ink,
    flexShrink: 1,
  },
  inactiveChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: NEUTRAL.surfaceSunken,
  },
  inactiveChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: NEUTRAL.inkSoft,
    letterSpacing: 0.4,
  },
  rowSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  balanceWrap: { alignItems: 'flex-end' },
  balanceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  balanceUnit: { fontSize: 9, color: NEUTRAL.inkSoft, letterSpacing: 0.5 },

  loadingBox: { paddingVertical: SPACING.xl, alignItems: 'center' },
  emptyBox: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: NEUTRAL.ink, marginBottom: 4 },
  emptyDesc: { fontSize: 12, color: NEUTRAL.inkSoft, textAlign: 'center' },
});
