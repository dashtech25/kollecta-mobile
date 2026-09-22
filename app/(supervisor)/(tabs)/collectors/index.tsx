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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/api-client';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

interface Collector {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  zones?: { id: string; name: string }[];
  branch?: { id: string; name: string; city: string } | null;
  _count?: { clients: number; collectorTransactions: number };
}

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

export default function CollectorsListScreen() {
  const { data: collectors, isLoading, refetch, isFetching } = useQuery<Collector[]>({
    queryKey: ['users', 'collectors'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users?role=COLLECTOR');
      return data.data || data;
    },
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const list = collectors ?? [];
  const totalCount = list.length;
  const activeCount = list.filter((c) => c.isActive).length;
  const totalClients = list.reduce(
    (s, c) => s + (c._count?.clients ?? 0),
    0,
  );
  const totalOps = list.reduce(
    (s, c) => s + (c._count?.collectorTransactions ?? 0),
    0,
  );
  const activeRatio = totalCount > 0 ? activeCount / totalCount : 0;

  const filtered = useMemo(() => {
    let l = list;
    if (filter === 'ACTIVE') l = l.filter((c) => c.isActive);
    else if (filter === 'INACTIVE') l = l.filter((c) => !c.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter((c) =>
        `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`
          .toLowerCase()
          .includes(q),
      );
    }
    // Sort: most active first
    return [...l].sort(
      (a, b) =>
        (b._count?.collectorTransactions ?? 0) -
        (a._count?.collectorTransactions ?? 0),
    );
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
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.iconBtn}>
            <Ionicons name="people" size={20} color={NEUTRAL.ink} />
          </View>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Équipe terrain</Text>
            <Text style={styles.topBarTitle}>Collecteurs</Text>
          </View>
          <TouchableOpacity
            style={styles.inviteCta}
            onPress={() => router.push('/(supervisor)/(tabs)/collectors/invite')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Inviter un collecteur"
          >
            <Ionicons name="add" size={16} color={NEUTRAL.inkOnFill} />
            <Text style={styles.inviteCtaText}>Inviter</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
          <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Collecteurs actifs</Text>
            <View style={styles.heroAmountRow}>
              {isLoading ? (
                <ActivityIndicator color={NEUTRAL.inkOnFill} />
              ) : (
                <Text style={styles.heroAmount}>
                  {activeCount} / {totalCount}
                </Text>
              )}
            </View>
            <Text style={styles.heroSub}>
              {totalClients} clients suivis
            </Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroFooterRow}>
              <View>
                <Text style={styles.heroFooterLabel}>Opérations</Text>
                <Text style={styles.heroFooterValue}>{fmtCompact(totalOps)}</Text>
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
            placeholder="Nom, e-mail ou téléphone…"
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
              ? 'Classement'
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
              <Ionicons name="people-outline" size={20} color={NEUTRAL.inkSoft} />
            </View>
            <Text style={styles.emptyTitle}>Aucun collecteur</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'Essayez un autre mot-clé.' : 'Aucun collecteur ne correspond à ce filtre.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((c, i) => (
              <Row
                key={c.id}
                item={c}
                rank={filter === 'ALL' && !search ? i + 1 : undefined}
                isFirst={i === 0}
                onPress={() =>
                  router.push(`/(supervisor)/(tabs)/collectors/${c.id}`)
                }
              />
            ))}
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function Row({
  item,
  rank,
  isFirst,
  onPress,
}: {
  item: Collector;
  rank?: number;
  isFirst: boolean;
  onPress: () => void;
}) {
  const initials = `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase();
  const clientCount = item._count?.clients ?? 0;
  const opsCount = item._count?.collectorTransactions ?? 0;
  const zoneNames = item.zones?.map((z) => z.name).join(' · ') || 'Aucune zone';

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.row, !isFirst && styles.rowDivider]}
    >
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, !item.isActive && styles.avatarInactive]}>
          <Text style={styles.avatarText}>{initials || '·'}</Text>
        </View>
        {rank !== undefined && rank <= 3 && (
          <View style={[styles.rankBadge, rankBg(rank)]}>
            <Text style={styles.rankBadgeText}>{rank}</Text>
          </View>
        )}
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
          {zoneNames}
        </Text>
      </View>
      <View style={styles.rowStats}>
        <View style={styles.rowStat}>
          <Text style={styles.rowStatValue}>{clientCount}</Text>
          <Text style={styles.rowStatLabel}>clients</Text>
        </View>
        <View style={styles.rowStat}>
          <Text style={styles.rowStatValue}>{fmtCompact(opsCount)}</Text>
          <Text style={styles.rowStatLabel}>opérations</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={NEUTRAL.inkSoft} />
    </TouchableOpacity>
  );
}

function rankBg(rank: number) {
  if (rank === 1) return { backgroundColor: '#F9A825' }; // gold
  if (rank === 2) return { backgroundColor: '#B0BEC5' }; // silver
  return { backgroundColor: '#A1887F' }; // bronze
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

// ──────────────── Styles ────────────────

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
  inviteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  inviteCtaText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
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
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: { opacity: 0.4 },
  avatarText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: NEUTRAL.surface,
  },
  rankBadgeText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rowMeta: { flex: 1 },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowName: { fontSize: 13, fontWeight: '600', color: NEUTRAL.ink, flexShrink: 1 },
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
  rowStats: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  rowStat: { alignItems: 'center', minWidth: 38 },
  rowStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  rowStatLabel: {
    fontSize: 9,
    color: NEUTRAL.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },

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
