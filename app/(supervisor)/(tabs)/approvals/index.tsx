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
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useWithdrawals } from '../../../../hooks/useWithdrawals';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { TransactionDetailSheet } from '../../../../components/transactions/TransactionDetailSheet';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import {
  WithdrawalRequest,
  WithdrawalStatus,
} from '../../../../types/withdrawal.types';
import { Transaction } from '../../../../types/transaction.types';

const STATUS_META: Record<
  WithdrawalStatus,
  {
    label: string;
    short: string;
    color: string;
    bg: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  INITIATED: {
    label: 'En attente',
    short: 'Initié',
    color: '#1E88E5',
    bg: '#E3F2FD',
    icon: 'hourglass-outline',
  },
  FUNDS_SENT: {
    label: 'Code à saisir',
    short: 'Code',
    color: '#F57C00',
    bg: '#FFF3E0',
    icon: 'mail-unread-outline',
  },
  COMPLETED: {
    label: 'Complété',
    short: 'OK',
    color: '#2E7D32',
    bg: '#E8F5E9',
    icon: 'checkmark-circle',
  },
  REJECTED: {
    label: 'Rejeté',
    short: 'KO',
    color: '#C62828',
    bg: '#FFEBEE',
    icon: 'close-circle',
  },
  EXPIRED: {
    label: 'Expiré',
    short: 'Exp',
    color: '#6D4C41',
    bg: '#EFEBE9',
    icon: 'time-outline',
  },
};

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

export default function WithdrawalHistoryScreen() {
  const { data, isLoading, refetch, isFetching } = useWithdrawals();
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'DONE'>('ALL');
  const [search, setSearch] = useState('');
  const [openedTx, setOpenedTx] = useState<Transaction | null>(null);

  const withdrawals: WithdrawalRequest[] = data?.withdrawals ?? [];

  const byStatus = useMemo(() => {
    const acc: Record<WithdrawalStatus, { count: number; amount: number }> = {
      INITIATED: { count: 0, amount: 0 },
      FUNDS_SENT: { count: 0, amount: 0 },
      COMPLETED: { count: 0, amount: 0 },
      REJECTED: { count: 0, amount: 0 },
      EXPIRED: { count: 0, amount: 0 },
    };
    withdrawals.forEach((w) => {
      acc[w.status].count++;
      acc[w.status].amount += Number(w.amount) || 0;
    });
    return acc;
  }, [withdrawals]);

  const totalCount = withdrawals.length;
  const inFlight = byStatus.INITIATED.count + byStatus.FUNDS_SENT.count;
  const inFlightAmount = byStatus.INITIATED.amount + byStatus.FUNDS_SENT.amount;
  const completedAmount = byStatus.COMPLETED.amount;
  const completionRatio =
    totalCount > 0 ? byStatus.COMPLETED.count / totalCount : 0;

  const donutSegments = useMemo(
    () =>
      [
        { key: 'COMPLETED' as WithdrawalStatus, value: byStatus.COMPLETED.count },
        { key: 'INITIATED' as WithdrawalStatus, value: byStatus.INITIATED.count },
        { key: 'FUNDS_SENT' as WithdrawalStatus, value: byStatus.FUNDS_SENT.count },
        { key: 'REJECTED' as WithdrawalStatus, value: byStatus.REJECTED.count },
        { key: 'EXPIRED' as WithdrawalStatus, value: byStatus.EXPIRED.count },
      ].filter((s) => s.value > 0),
    [byStatus],
  );

  const filteredList = useMemo(() => {
    let list = withdrawals;
    if (filter === 'OPEN')
      list = list.filter(
        (w) => w.status === 'INITIATED' || w.status === 'FUNDS_SENT',
      );
    else if (filter === 'DONE')
      list = list.filter(
        (w) =>
          w.status === 'COMPLETED' ||
          w.status === 'REJECTED' ||
          w.status === 'EXPIRED',
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        `${w.client?.firstName ?? ''} ${w.client?.lastName ?? ''} ${w.collector?.firstName ?? ''} ${w.collector?.lastName ?? ''}`
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [withdrawals, filter, search]);

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
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View style={styles.iconBtn}>
            <Ionicons name="arrow-up-circle" size={20} color={NEUTRAL.ink} />
          </View>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Supervision</Text>
            <Text style={styles.topBarTitle}>Historique retraits</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </View>
        </View>

        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
          <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Retraits en cours</Text>
            <View style={styles.heroAmountRow}>
              {isLoading ? (
                <ActivityIndicator color={NEUTRAL.inkOnFill} />
              ) : (
                <Text style={styles.heroAmount}>{fmtAmount(inFlightAmount)}</Text>
              )}
            </View>
            <Text style={styles.heroSub}>
              {inFlight} demande{inFlight > 1 ? 's' : ''} en attente
            </Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroFooterRow}>
              <View>
                <Text style={styles.heroFooterLabel}>Complétés</Text>
                <Text style={styles.heroFooterValue}>
                  {fmtCompact(completedAmount)} FCFA
                </Text>
              </View>
              <View style={styles.heroFooterDivider} />
              <View>
                <Text style={styles.heroFooterLabel}>Total</Text>
                <Text style={styles.heroFooterValue}>{totalCount}</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroArcWrap}>
            <ProgressArc
              ratio={completionRatio}
              size={104}
              strokeWidth={8}
              trackColor="rgba(255,255,255,0.15)"
              progressColor={NEUTRAL.inkOnFill}
            />
            <View style={styles.heroArcCenter} pointerEvents="none">
              <Text style={styles.heroArcPct}>
                {Math.round(completionRatio * 100)}%
              </Text>
              <Text style={styles.heroArcLabel}>complétés</Text>
            </View>
          </View>
        </View>

        {/* ── Donut + legend ── */}
        <View style={styles.donutCard}>
          <DecorBg variant="grid" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={220} />
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Répartition par statut</Text>
              <Text style={styles.cardSub}>{totalCount} retraits au total</Text>
            </View>
          </View>

          {totalCount === 0 ? (
            <View style={styles.donutEmpty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="pie-chart-outline" size={20} color={NEUTRAL.inkSoft} />
              </View>
              <Text style={styles.emptyTitle}>Aucun retrait</Text>
              <Text style={styles.emptyDesc}>
                Les statistiques apparaîtront avec le premier retrait.
              </Text>
            </View>
          ) : (
            <View style={styles.donutRow}>
              <View style={styles.donutWrap}>
                <Donut
                  segments={donutSegments.map((s) => ({
                    value: s.value,
                    color: STATUS_META[s.key].color,
                  }))}
                  size={140}
                  strokeWidth={20}
                />
                <View style={styles.donutCenter} pointerEvents="none">
                  <Text style={styles.donutCenterValue}>{totalCount}</Text>
                  <Text style={styles.donutCenterLabel}>retraits</Text>
                </View>
              </View>
              <View style={styles.legendCol}>
                {donutSegments.map((s) => {
                  const meta = STATUS_META[s.key];
                  const pct = totalCount > 0 ? Math.round((s.value / totalCount) * 100) : 0;
                  return (
                    <View key={s.key} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legendLabel}>{meta.label}</Text>
                        <Text style={styles.legendSub}>
                          {s.value} · {pct}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ── Search + filter ── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={NEUTRAL.inkSoft} />
          <TextInput
            placeholder="Client ou collecteur…"
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
          <Text style={styles.sectionTitle}>Historique</Text>
          <View style={styles.filterRow}>
            {(['ALL', 'OPEN', 'DONE'] as const).map((f) => {
              const active = filter === f;
              const label = f === 'ALL' ? 'Tous' : f === 'OPEN' ? 'En cours' : 'Terminés';
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
        ) : filteredList.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={20} color={NEUTRAL.inkSoft} />
            </View>
            <Text style={styles.emptyTitle}>Aucun retrait</Text>
            <Text style={styles.emptyDesc}>
              {search ? 'Essayez un autre mot-clé.' : 'Pas de retrait correspondant à ce filtre.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredList.map((w, i) => (
              <Row
                key={w.id}
                item={w}
                isFirst={i === 0}
                onPress={() => setOpenedTx(withdrawalToTx(w))}
              />
            ))}
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <TransactionDetailSheet
        transaction={openedTx}
        visible={!!openedTx}
        onClose={() => setOpenedTx(null)}
      />
    </SafeAreaView>
  );
}

/**
 * WithdrawalRequest → Transaction adapter for the shared detail sheet. Once
 * the withdrawal completes it has a transactionId; for in-flight ones we
 * synthesize a Transaction-shaped object so the sheet can still render the
 * workflow / OTP / location panels without an extra round-trip.
 */
function withdrawalToTx(w: WithdrawalRequest): Transaction {
  return {
    id: w.transactionId ?? w.id,
    type: 'WITHDRAWAL',
    amount: Number(w.amount) || 0,
    status: w.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
    clientId: w.clientId,
    collectorId: w.collectorId,
    latitude: null,
    longitude: null,
    note: null,
    createdAt: w.createdAt,
    client: w.client,
    collector: w.collector,
    depositRequest: null,
    withdrawalRequest: {
      id: w.id,
      status: w.status,
      method: w.method,
      momoProvider: w.momoProvider as any,
      momoNumber: w.momoNumber,
      smsCodeVerified: w.smsCodeVerified,
      sentToClient: w.sentToClient,
      sentToClientAt: w.sentToClientAt,
      initiatedAt: w.initiatedAt,
      fundsSentAt: w.fundsSentAt,
      completedAt: w.completedAt,
      rejectedAt: w.rejectedAt,
      rejectionReason: w.rejectionReason,
      receiptUrl: w.receiptUrl ?? null,
      receiptSentAt: w.receiptSentAt ?? null,
    },
  };
}

// ──────────────── Sub-components ────────────────

function Row({
  item,
  isFirst,
  onPress,
}: {
  item: WithdrawalRequest;
  isFirst: boolean;
  onPress: () => void;
}) {
  const meta = STATUS_META[item.status];
  const date = new Date(item.createdAt);
  const dateLabel = formatRelative(date);

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.row, !isFirst && styles.rowDivider]}
    >
      <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.client?.firstName} {item.client?.lastName}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          par {item.collector?.firstName} {item.collector?.lastName} ·{' '}
          {item.method === 'CASH'
            ? 'Espèces'
            : item.momoProvider === 'ORANGE_MONEY'
              ? 'Orange'
              : 'MTN'}{' '}
          · {dateLabel}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{fmtAmount(Number(item.amount) || 0)}</Text>
        <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusChipText, { color: meta.color }]}>
            {meta.short}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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

function Donut({
  segments,
  size,
  strokeWidth,
}: {
  segments: { value: number; color: string }[];
  size: number;
  strokeWidth: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const c = size / 2;
  const total = segments.reduce((a, b) => a + b.value, 0);
  if (total === 0) return null;
  let cumAngle = -Math.PI / 2;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={c}
        cy={c}
        r={radius}
        stroke={NEUTRAL.surfaceSunken}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <G>
        {segments.map((s, i) => {
          const angle = (s.value / total) * 2 * Math.PI;
          const startAngle = cumAngle;
          const endAngle = cumAngle + angle;
          cumAngle = endAngle;
          const x1 = c + radius * Math.cos(startAngle);
          const y1 = c + radius * Math.sin(startAngle);
          const x2 = c + radius * Math.cos(endAngle);
          const y2 = c + radius * Math.sin(endAngle);
          const largeArc = angle > Math.PI ? 1 : 0;
          const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
          return (
            <Path
              key={i}
              d={d}
              stroke={s.color}
              strokeWidth={strokeWidth}
              fill="none"
            />
          );
        })}
      </G>
    </Svg>
  );
}

function formatRelative(d: Date) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NEUTRAL.bg },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  // Top bar
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
  countBadgeText: { fontSize: 12, fontWeight: '700', color: NEUTRAL.ink, fontVariant: ['tabular-nums'] },

  // Hero (same as collector withdrawal)
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
    ...StyleSheet.absoluteFill,
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

  // Card shared
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
  cardSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },

  // Donut
  donutCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 22,
    fontWeight: '800',
    color: NEUTRAL.ink,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  donutCenterLabel: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  legendCol: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontWeight: '600', color: NEUTRAL.ink },
  legendSub: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  donutEmpty: { paddingVertical: SPACING.lg, alignItems: 'center' },

  // Search
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

  // Section + filters
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

  // List
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
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: { flex: 1 },
  rowName: { fontSize: 13, fontWeight: '600', color: NEUTRAL.ink },
  rowSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  statusChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },

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
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: NEUTRAL.ink,
    marginBottom: 4,
  },
  emptyDesc: { fontSize: 12, color: NEUTRAL.inkSoft, textAlign: 'center' },
});
