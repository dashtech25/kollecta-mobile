import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useDashboardStats, useRecentActivity } from '../../../hooks/useDashboard';
import { useAuthStore } from '../../../stores/auth.store';
import { DecorBg } from '../../../components/ui/DecorBg';
import { TransactionsSheet } from '../../../components/transactions/TransactionsSheet';
import { TransactionDetailSheet } from '../../../components/transactions/TransactionDetailSheet';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { Transaction } from '../../../types/transaction.types';

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

const dayShortFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const greetingForHour = (h: number) =>
  h < 5 ? 'Bonsoir' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';

export default function SupervisorDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading, refetch, isFetching } = useDashboardStats();
  const { data: recent } = useRecentActivity(80);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openedTx, setOpenedTx] = useState<Transaction | null>(null);

  const greeting = greetingForHour(new Date().getHours());
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // ── Derived metrics ─────────────────────────────────
  const todayDepositAmount = stats?.today.deposits.amount ?? 0;
  const todayDepositCount = stats?.today.deposits.count ?? 0;
  const todayWithdrawalAmount = stats?.today.withdrawals?.amount ?? 0;
  const todayWithdrawalCount = stats?.today.withdrawals?.count ?? 0;
  const totalClients = stats?.totalClients ?? 0;
  const activeCollectors = stats?.activeCollectors ?? 0;
  const pendingWithdrawals = stats?.pendingWithdrawals ?? 0;
  const monthDeposits = stats?.month.deposits.amount ?? 0;
  const monthWithdrawals = stats?.month.withdrawals?.amount ?? 0;

  const netToday = todayDepositAmount - todayWithdrawalAmount;
  const netRatio = todayDepositAmount + todayWithdrawalAmount > 0
    ? todayDepositAmount / (todayDepositAmount + todayWithdrawalAmount)
    : 0;

  // 7-day deposits vs withdrawals
  const split = useMemo(() => buildSevenDaySplit(recent ?? []), [recent]);
  const maxSplit = Math.max(...split.flatMap((d) => [d.dep, d.wit]), 1);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (isFetching && !isLoading)}
            onRefresh={onRefresh}
            tintColor={NEUTRAL.ink}
          />
        }
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/(supervisor)/settings')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les paramètres"
          >
            <Text style={styles.avatarText}>{initials || '·'}</Text>
          </TouchableOpacity>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarGreeting}>{greeting},</Text>
            <Text style={styles.topBarName} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(supervisor)/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color={NEUTRAL.ink} />
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
          <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Flux net du jour</Text>
            <View style={styles.heroAmountRow}>
              {isLoading ? (
                <ActivityIndicator color={NEUTRAL.inkOnFill} />
              ) : (
                <Text style={styles.heroAmount}>
                  {netToday >= 0 ? '+' : '−'} {fmtAmount(Math.abs(netToday))}
                </Text>
              )}
            </View>
            <Text style={styles.heroSub}>
              {todayDepositCount} dépôt{todayDepositCount > 1 ? 's' : ''} ·{' '}
              {todayWithdrawalCount} retrait{todayWithdrawalCount > 1 ? 's' : ''}
            </Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroFooter} numberOfLines={1}>
              {today}
            </Text>
          </View>
          <View style={styles.heroArcWrap}>
            <ProgressArc
              ratio={netRatio}
              size={104}
              strokeWidth={8}
              trackColor="rgba(255,255,255,0.15)"
              progressColor={NEUTRAL.inkOnFill}
            />
            <View style={styles.heroArcCenter} pointerEvents="none">
              <Text style={styles.heroArcPct}>{Math.round(netRatio * 100)}%</Text>
              <Text style={styles.heroArcLabel}>dépôts</Text>
            </View>
          </View>
        </View>

        {/* ── KPI grid ── */}
        <View style={styles.kpiGrid}>
          <KpiTile
            icon="people"
            label="Collecteurs"
            value={String(activeCollectors)}
            sub="actifs"
            decor="dots"
            onPress={() => router.push('/(supervisor)/(tabs)/collectors')}
          />
          <KpiTile
            icon="person"
            label="Clients"
            value={String(totalClients)}
            sub="au total"
            decor="arc"
            onPress={() => router.push('/(supervisor)/(tabs)/clients')}
          />
          <KpiTile
            icon="hourglass"
            label="À traiter"
            value={String(pendingWithdrawals)}
            sub="retraits"
            decor="dots"
            highlight={pendingWithdrawals > 0}
            onPress={() => router.push('/(supervisor)/(tabs)/approvals')}
          />
          <KpiTile
            icon="cash"
            label="Mois"
            value={fmtCompact(monthDeposits)}
            sub="FCFA collectés"
            decor="arc"
          />
        </View>

        {/* ── 7-day chart ── */}
        <View style={styles.chartCard}>
          <DecorBg variant="grid" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={220} />
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Activité 7 jours</Text>
              <Text style={styles.cardSub}>Dépôts vs retraits</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Dépôts</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: NEUTRAL.ink }]} />
                <Text style={styles.legendText}>Retraits</Text>
              </View>
            </View>
          </View>

          <SplitChart split={split} maxValue={maxSplit} />

          <View style={styles.chartFooter}>
            <View style={styles.chartFooterItem}>
              <Text style={styles.chartFooterLabel}>Mois · dépôts</Text>
              <Text style={styles.chartFooterValue}>
                {fmtCompact(monthDeposits)} FCFA
              </Text>
            </View>
            <View style={styles.chartFooterDivider} />
            <View style={styles.chartFooterItem}>
              <Text style={styles.chartFooterLabel}>Mois · retraits</Text>
              <Text style={styles.chartFooterValue}>
                {fmtCompact(monthWithdrawals)} FCFA
              </Text>
            </View>
            <View style={styles.chartFooterDivider} />
            <View style={styles.chartFooterItem}>
              <Text style={styles.chartFooterLabel}>Solde net</Text>
              <Text
                style={[
                  styles.chartFooterValue,
                  {
                    color:
                      monthDeposits >= monthWithdrawals
                        ? '#2E7D32'
                        : COLORS.error,
                  },
                ]}
              >
                {monthDeposits >= monthWithdrawals ? '+' : '−'}{' '}
                {fmtCompact(Math.abs(monthDeposits - monthWithdrawals))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Recent activity ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activité récente</Text>
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Voir toutes les transactions"
          >
            <View style={styles.viewAllPill}>
              <Text style={styles.viewAllText}>Voir tout</Text>
              <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {!recent || recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={20} color={NEUTRAL.inkSoft} />
              </View>
              <Text style={styles.emptyTitle}>Aucune opération récente</Text>
              <Text style={styles.emptyDesc}>
                Les transactions apparaîtront ici dès qu'un collecteur en effectuera.
              </Text>
            </View>
          ) : (
            recent.slice(0, 6).map((tx, idx) => (
              <ActivityRow
                key={tx.id}
                tx={tx}
                isFirst={idx === 0}
                onPress={() => setOpenedTx(tx)}
              />
            ))
          )}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <TransactionsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        showCollector
      />

      <TransactionDetailSheet
        transaction={openedTx}
        visible={!!openedTx}
        onClose={() => setOpenedTx(null)}
      />
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function KpiTile({
  icon,
  label,
  value,
  sub,
  decor,
  highlight,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  decor: 'dots' | 'arc';
  highlight?: boolean;
  onPress?: () => void;
}) {
  const Wrap: any = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={[styles.kpiTile, highlight && styles.kpiTileHighlight]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <DecorBg
        variant={decor}
        anchor={decor === 'dots' ? 'top-right' : 'bottom-right'}
        color={COLORS.primary}
        opacity={decor === 'dots' ? 0.08 : 0.1}
        width={decor === 'dots' ? 70 : 110}
        height={decor === 'dots' ? 70 : 110}
      />
      <View
        style={[
          styles.kpiTileIcon,
          highlight && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
        ]}
      >
        <Ionicons
          name={icon}
          size={14}
          color={highlight ? NEUTRAL.inkOnFill : COLORS.primary}
        />
      </View>
      <Text style={styles.kpiTileLabel}>{label}</Text>
      <Text style={styles.kpiTileValue}>{value}</Text>
      <Text style={styles.kpiTileSub}>{sub}</Text>
    </Wrap>
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

function SplitChart({
  split,
  maxValue,
}: {
  split: { day: string; dep: number; wit: number; isToday: boolean }[];
  maxValue: number;
}) {
  const chartHeight = 110;
  return (
    <View>
      <View style={[splitStyles.chart, { height: chartHeight }]}>
        {split.map((d, i) => {
          const depRatio = d.dep / maxValue;
          const witRatio = d.wit / maxValue;
          const depH = Math.max(depRatio * chartHeight, d.dep > 0 ? 4 : 0);
          const witH = Math.max(witRatio * chartHeight, d.wit > 0 ? 4 : 0);
          return (
            <View key={i} style={splitStyles.dayCol}>
              <View style={splitStyles.bars}>
                <View style={splitStyles.barWrap}>
                  <View
                    style={[
                      splitStyles.bar,
                      {
                        height: depH,
                        backgroundColor: d.isToday ? COLORS.primaryDark : COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <View style={splitStyles.barWrap}>
                  <View
                    style={[
                      splitStyles.bar,
                      {
                        height: witH,
                        backgroundColor: d.isToday ? '#000' : NEUTRAL.ink,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View style={splitStyles.labelsRow}>
        {split.map((d, i) => (
          <Text
            key={i}
            style={[splitStyles.label, d.isToday && splitStyles.labelToday]}
          >
            {d.day}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ActivityRow({
  tx,
  isFirst,
  onPress,
}: {
  tx: Transaction;
  isFirst: boolean;
  onPress?: () => void;
}) {
  const isDeposit = tx.type === 'DEPOSIT';
  const req = tx.depositRequest ?? tx.withdrawalRequest ?? null;
  const methodLabel = req
    ? req.method === 'CASH'
      ? 'Espèces'
      : req.momoProvider === 'ORANGE_MONEY'
        ? 'Orange'
        : req.momoProvider === 'MTN_MONEY'
          ? 'MTN'
          : 'MoMo'
    : null;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.activityRow,
        !isFirst && styles.activityRowDivider,
        pressed && { backgroundColor: NEUTRAL.surfaceAlt },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Voir le détail de la transaction de ${fmtAmount(tx.amount)}`}
    >
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: isDeposit ? '#dcfce7' : '#fee2e2' },
        ]}
      >
        <Ionicons
          name={isDeposit ? 'arrow-down' : 'arrow-up'}
          size={14}
          color={isDeposit ? '#15803d' : COLORS.primary}
        />
      </View>
      <View style={styles.activityMeta}>
        <Text style={styles.activityName} numberOfLines={1}>
          {tx.client?.firstName} {tx.client?.lastName}
        </Text>
        <Text style={styles.activitySub} numberOfLines={1}>
          {isDeposit ? 'Dépôt' : 'Retrait'} ·{' '}
          {tx.collector
            ? `${tx.collector.firstName} ${tx.collector.lastName}`
            : 'Collecteur'}
          {tx.collector?.branch ? ` · ${tx.collector.branch.name}` : ''}{' '}
          · {formatRelativeDate(tx.createdAt)}
        </Text>
        {(methodLabel || tx.status !== 'COMPLETED') && (
          <View style={styles.activityBadgesRow}>
            {methodLabel && (
              <View style={styles.activityBadge}>
                <Text style={styles.activityBadgeText}>{methodLabel}</Text>
              </View>
            )}
            {tx.status !== 'COMPLETED' && (
              <View
                style={[
                  styles.activityBadge,
                  { backgroundColor: '#fef3c7' },
                ]}
              >
                <Text
                  style={[styles.activityBadgeText, { color: '#92400e' }]}
                >
                  {tx.status === 'PENDING' ? 'En attente' : tx.status}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      <Text
        style={[
          styles.activityAmount,
          { color: isDeposit ? '#15803d' : COLORS.primary },
        ]}
      >
        {isDeposit ? '+' : '−'} {fmtAmount(Number(tx.amount) || 0)}
      </Text>
    </Pressable>
  );
}

// ──────────────── Helpers ────────────────

function buildSevenDaySplit(transactions: Transaction[]) {
  const days: {
    day: string;
    dep: number;
    wit: number;
    isToday: boolean;
    date: Date;
  }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      day: dayShortFr[d.getDay()],
      dep: 0,
      wit: 0,
      isToday: i === 0,
      date: d,
    });
  }
  transactions.forEach((tx) => {
    const d = new Date(tx.createdAt);
    d.setHours(0, 0, 0, 0);
    const slot = days.find((x) => x.date.getTime() === d.getTime());
    if (!slot) return;
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'DEPOSIT') slot.dep += amount;
    else if (tx.type === 'WITHDRAWAL') slot.wit += amount;
  });
  return days.map(({ day, dep, wit, isToday }) => ({ day, dep, wit, isToday }));
}

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
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
  avatar: {
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
  avatarText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topBarMeta: { flex: 1 },
  topBarGreeting: { fontSize: 13, color: NEUTRAL.inkMid },
  topBarName: {
    fontSize: 16,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginTop: 1,
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
  heroFooter: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textTransform: 'capitalize',
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

  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  kpiTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
    minHeight: 96,
  },
  kpiTileHighlight: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff8f8',
  },
  kpiTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde0e0',
    marginBottom: 8,
  },
  kpiTileLabel: {
    fontSize: 10,
    color: NEUTRAL.inkMid,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiTileValue: {
    fontSize: 18,
    fontWeight: '800',
    color: NEUTRAL.ink,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  kpiTileSub: { fontSize: 10, color: NEUTRAL.inkSoft, marginTop: 2 },

  // Chart card
  chartCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
  cardSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  legendRow: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: NEUTRAL.inkMid, fontWeight: '600' },
  chartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: BORDER_RADIUS.md,
    padding: 10,
    marginTop: 14,
  },
  chartFooterItem: { flex: 1 },
  chartFooterDivider: {
    width: 1,
    height: 24,
    backgroundColor: NEUTRAL.border,
    marginHorizontal: 8,
  },
  chartFooterLabel: {
    fontSize: 9,
    color: NEUTRAL.inkSoft,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chartFooterValue: {
    fontSize: 13,
    fontWeight: '800',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: NEUTRAL.ink },
  viewAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#fde0e0',
  },
  viewAllText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

  // Activity
  activityCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
  },
  activityRowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityMeta: { flex: 1 },
  activityName: { fontSize: 13, fontWeight: '600', color: NEUTRAL.ink },
  activitySub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  activityAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  activityBadgesRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  activityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: NEUTRAL.surfaceSunken,
  },
  activityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: NEUTRAL.inkMid,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Empty
  emptyBox: {
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
  emptyDesc: {
    fontSize: 12,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
  },
});

const splitStyles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  dayCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: '100%',
  },
  barWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: 4,
    overflow: 'hidden',
    minHeight: 4,
  },
  bar: {
    borderRadius: 4,
    minHeight: 0,
  },
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
