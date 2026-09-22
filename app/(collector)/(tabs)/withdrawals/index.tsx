import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useWithdrawals } from '../../../../hooks/useWithdrawals';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { WithdrawalRequest, WithdrawalStatus } from '../../../../types/withdrawal.types';

type StatusKey = 'PENDING' | 'INITIATED' | 'FUNDS_SENT' | 'COMPLETED' | 'REJECTED';

const STATUS_META: Record<
  WithdrawalStatus,
  { label: string; short: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
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
    short: 'Code SMS',
    color: '#F57C00',
    bg: '#FFF3E0',
    icon: 'mail-unread-outline',
  },
  COMPLETED: {
    label: 'Complété',
    short: 'Complété',
    color: '#2E7D32',
    bg: '#E8F5E9',
    icon: 'checkmark-circle',
  },
  REJECTED: {
    label: 'Rejeté',
    short: 'Rejeté',
    color: '#C62828',
    bg: '#FFEBEE',
    icon: 'close-circle',
  },
  EXPIRED: {
    label: 'Expiré',
    short: 'Expiré',
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

const dayShortFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function WithdrawalsListScreen() {
  const { data, isLoading, refetch, isFetching } = useWithdrawals();
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'DONE'>('ALL');

  const withdrawals: WithdrawalRequest[] = data?.withdrawals ?? [];

  // Stats by status
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
      // Defensive coercion — Prisma Decimal columns can serialize as strings
      // and `0 + "100000"` would concatenate instead of adding.
      acc[w.status].amount += Number(w.amount) || 0;
    });
    return acc;
  }, [withdrawals]);

  const totalCount = withdrawals.length;
  const inFlightCount = byStatus.INITIATED.count + byStatus.FUNDS_SENT.count;
  const inFlightAmount = byStatus.INITIATED.amount + byStatus.FUNDS_SENT.amount;
  const completedAmount = byStatus.COMPLETED.amount;
  const completionRatio =
    totalCount > 0 ? byStatus.COMPLETED.count / totalCount : 0;

  // Trend: amounts per day for last 7 days
  const trend = useMemo(() => buildSevenDayTrend(withdrawals), [withdrawals]);
  const maxTrendVal = Math.max(...trend.map((d) => d.amount), 1);

  // Donut data
  const donutSegments = useMemo(() => {
    const segments = [
      { key: 'COMPLETED' as WithdrawalStatus, value: byStatus.COMPLETED.count },
      { key: 'INITIATED' as WithdrawalStatus, value: byStatus.INITIATED.count },
      { key: 'FUNDS_SENT' as WithdrawalStatus, value: byStatus.FUNDS_SENT.count },
      { key: 'REJECTED' as WithdrawalStatus, value: byStatus.REJECTED.count },
      { key: 'EXPIRED' as WithdrawalStatus, value: byStatus.EXPIRED.count },
    ].filter((s) => s.value > 0);
    return segments;
  }, [byStatus]);

  // Filter list
  const filteredList = useMemo(() => {
    if (filter === 'ALL') return withdrawals;
    if (filter === 'OPEN')
      return withdrawals.filter(
        (w) => w.status === 'INITIATED' || w.status === 'FUNDS_SENT',
      );
    return withdrawals.filter(
      (w) =>
        w.status === 'COMPLETED' ||
        w.status === 'REJECTED' ||
        w.status === 'EXPIRED',
    );
  }, [withdrawals, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.topBarOver}>Décaissement</Text>
            <Text style={styles.topBarTitle}>Retraits</Text>
          </View>
          <TouchableOpacity
            style={styles.newCta}
            onPress={() => router.push('/(collector)/(tabs)/withdrawals/initiate')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Nouveau retrait"
          >
            <Ionicons name="add" size={16} color={NEUTRAL.inkOnFill} />
            <Text style={styles.newCtaText}>Nouveau</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero card ── */}
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
              {inFlightCount} demande{inFlightCount > 1 ? 's' : ''} en attente
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

        {/* ── Status donut + legend ── */}
        <View style={styles.donutCard}>
          <DecorBg
            variant="grid"
            anchor="fill"
            color={COLORS.primary}
            opacity={0.04}
            width={400}
            height={220}
          />
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
                Les statistiques apparaîtront avec votre premier retrait.
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

        {/* ── 7-day trend ── */}
        <View style={styles.trendCard}>
          <DecorBg
            variant="diagonals"
            anchor="fill"
            color={COLORS.primary}
            opacity={0.03}
            width={400}
            height={220}
          />
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Volume sur 7 jours</Text>
              <Text style={styles.cardSub}>FCFA décaissés par jour</Text>
            </View>
            <View style={styles.trendLegend}>
              <View style={styles.trendLegendItem}>
                <View style={[styles.trendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.trendLegendText}>Retraits</Text>
              </View>
              <View style={styles.trendLegendItem}>
                <View style={[styles.trendDot, { backgroundColor: NEUTRAL.ink }]} />
                <Text style={styles.trendLegendText}>Aujourd'hui</Text>
              </View>
            </View>
          </View>
          <TrendChart trend={trend} maxValue={maxTrendVal} />
        </View>

        {/* ── Filter pills ── */}
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

        {/* ── List ── */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : filteredList.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={NEUTRAL.inkSoft}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'OPEN'
                ? 'Aucun retrait en cours'
                : filter === 'DONE'
                  ? 'Aucun retrait terminé'
                  : 'Aucun retrait'}
            </Text>
            <Text style={styles.emptyDesc}>
              Initiez un retrait pour le voir apparaître ici.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredList.map((w, i) => (
              <WithdrawalRow
                key={w.id}
                item={w}
                isFirst={i === 0}
                onPress={() => {
                  // Any withdrawal that hasn't been verified or terminated
                  // is resumable — tapping it returns the collector to the
                  // OTP entry screen so they can finish the flow.
                  if (
                    w.status === 'INITIATED' ||
                    w.status === 'FUNDS_SENT'
                  ) {
                    router.push(
                      `/(collector)/(tabs)/withdrawals/verify/${w.id}`,
                    );
                  }
                }}
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

  let cumAngle = -Math.PI / 2; // start at top
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
              strokeLinecap="butt"
            />
          );
        })}
      </G>
    </Svg>
  );
}

function TrendChart({
  trend,
  maxValue,
}: {
  trend: { day: string; amount: number; isToday: boolean }[];
  maxValue: number;
}) {
  const chartHeight = 110;
  return (
    <View>
      <View style={[trendStyles.chart, { height: chartHeight }]}>
        {trend.map((d, i) => {
          const ratio = d.amount / maxValue;
          const barH = Math.max(ratio * chartHeight, 4);
          return (
            <View key={i} style={trendStyles.barCol}>
              <View style={trendStyles.barTrack}>
                <View
                  style={[
                    trendStyles.bar,
                    { height: barH },
                    d.isToday && trendStyles.barToday,
                    d.amount === 0 && !d.isToday && trendStyles.barEmpty,
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={trendStyles.labelsRow}>
        {trend.map((d, i) => (
          <Text
            key={i}
            style={[trendStyles.label, d.isToday && trendStyles.labelToday]}
          >
            {d.day}
          </Text>
        ))}
      </View>
    </View>
  );
}

function WithdrawalRow({
  item,
  isFirst,
  onPress,
}: {
  item: WithdrawalRequest;
  isFirst: boolean;
  onPress: () => void;
}) {
  const meta = STATUS_META[item.status];
  // Resumable = OTP was sent but not yet verified, regardless of which
  // legacy status row it lands on (INITIATED for new flow, FUNDS_SENT for
  // already-seeded data).
  const isInteractive =
    item.status === 'INITIATED' || item.status === 'FUNDS_SENT';
  const date = new Date(item.createdAt);
  const dateLabel = formatRelative(date);

  return (
    <TouchableOpacity
      activeOpacity={isInteractive ? 0.78 : 1}
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
        <View style={styles.rowSubRow}>
          <Text style={styles.rowSub}>
            {item.method === 'CASH'
              ? 'Espèces'
              : item.momoProvider === 'ORANGE_MONEY'
                ? 'Orange'
                : 'MTN'}{' '}
            · {dateLabel}
          </Text>
        </View>
        {isInteractive && (
          <Text style={styles.rowAction}>Saisir le code SMS →</Text>
        )}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{fmtAmount(item.amount)}</Text>
        <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusChipText, { color: meta.color }]}>
            {meta.short}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────── Helpers ────────────────

function buildSevenDayTrend(items: WithdrawalRequest[]) {
  const days: { day: string; amount: number; isToday: boolean; date: Date }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      day: dayShortFr[d.getDay()],
      amount: 0,
      isToday: i === 0,
      date: d,
    });
  }
  items.forEach((w) => {
    const d = new Date(w.createdAt);
    d.setHours(0, 0, 0, 0);
    const slot = days.find((x) => x.date.getTime() === d.getTime());
    if (slot) slot.amount += w.amount;
  });
  return days.map(({ day, amount, isToday }) => ({ day, amount, isToday }));
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
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginTop: 1,
  },
  newCta: {
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
  newCtaText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Hero
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

  // Card shared
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
  cardSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },

  // Donut card
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
    ...StyleSheet.absoluteFillObject,
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
  legendCol: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontWeight: '600', color: NEUTRAL.ink },
  legendSub: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  donutEmpty: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },

  // Trend card
  trendCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  trendLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendDot: { width: 8, height: 8, borderRadius: 4 },
  trendLegendText: { fontSize: 10, color: NEUTRAL.inkMid, fontWeight: '600' },

  // Section + filters
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
  },
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
  rowSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rowSub: { fontSize: 11, color: NEUTRAL.inkSoft },
  rowAction: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
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

  // Empty / loading
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

const trendStyles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    minHeight: 4,
  },
  barEmpty: { backgroundColor: NEUTRAL.borderSoft, minHeight: 4 },
  barToday: { backgroundColor: NEUTRAL.ink },
  labelsRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  label: {
    flex: 1,
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  labelToday: { color: NEUTRAL.ink, fontWeight: '700' },
});
