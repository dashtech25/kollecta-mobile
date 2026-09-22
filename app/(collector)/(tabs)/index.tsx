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
import { CoverageRing } from '../../../components/dashboard/CoverageRing';
import { HourlyPulse } from '../../../components/dashboard/HourlyPulse';
import { TransactionsSheet } from '../../../components/transactions/TransactionsSheet';
import { TransactionDetailSheet } from '../../../components/transactions/TransactionDetailSheet';
import { DecorBg } from '../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { Transaction } from '../../../types/transaction.types';

// Daily target until backend exposes a per-collector goal
const DAILY_TARGET_FCFA = 200_000;

const fmtAmount = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

const greetingForHour = (h: number) =>
  h < 5 ? 'Bonsoir' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';

export default function CollectorDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading, refetch, isFetching } = useDashboardStats();
  const { data: recent } = useRecentActivity(50);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openedTx, setOpenedTx] = useState<Transaction | null>(null);

  const greeting = greetingForHour(new Date().getHours());
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const todayAmount = stats?.today.deposits.amount ?? 0;
  const todayCount = stats?.today.deposits.count ?? 0;
  const targetRatio = Math.min(todayAmount / DAILY_TARGET_FCFA, 1);
  const targetPct = Math.round(targetRatio * 100);

  // Visited unique clients today (approximated from recent activity for now)
  const visitedToday = useMemo(() => {
    if (!recent) return 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const ids = new Set<string>();
    recent.forEach((tx) => {
      if (tx.type !== 'DEPOSIT') return;
      if (new Date(tx.createdAt) < startOfDay) return;
      ids.add(tx.clientId);
    });
    return ids.size;
  }, [recent]);

  const totalClients = stats?.totalClients ?? 0;
  const avgTicket = todayCount > 0 ? todayAmount / todayCount : 0;

  // Smart insight: build a single sentence based on signals
  const insight = useMemo(
    () => buildInsight({ todayAmount, todayCount, targetRatio, hour: new Date().getHours() }),
    [todayAmount, todayCount, targetRatio],
  );

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push('/(collector)/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le profil"
              activeOpacity={0.8}
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
              onPress={() => router.push('/(collector)/reports')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir les rapports"
            >
              <Ionicons name="document-text-outline" size={20} color={NEUTRAL.ink} />
            </TouchableOpacity>
          </View>

          {/* ── Hero card with progress arc ── */}
          <View style={styles.heroCard}>
            <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
            <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Collecté aujourd'hui</Text>
              <View style={styles.heroAmountRow}>
                {isLoading ? (
                  <ActivityIndicator color={NEUTRAL.inkOnFill} />
                ) : (
                  <Text style={styles.heroAmount}>{fmtAmount(todayAmount)}</Text>
                )}
              </View>
              <Text style={styles.heroSub}>
                Objectif {fmtAmount(DAILY_TARGET_FCFA)} · {targetPct}%
              </Text>
              <View style={styles.heroDivider} />
              <Text style={styles.heroFooterText}>
                {todayCount} dépôt{todayCount > 1 ? 's' : ''} · {today}
              </Text>
            </View>

            {/* SVG progress arc on the right side of hero */}
            <View style={styles.heroArcWrap}>
              <ProgressArc
                ratio={targetRatio}
                size={104}
                strokeWidth={8}
                trackColor="rgba(255,255,255,0.15)"
                progressColor={NEUTRAL.inkOnFill}
              />
              <View style={styles.heroArcCenter} pointerEvents="none">
                <Text style={styles.heroArcPct}>{targetPct}%</Text>
                <Text style={styles.heroArcLabel}>du jour</Text>
              </View>
            </View>
          </View>

          {/* ── Smart insight banner ── */}
          <View style={styles.insightCard}>
            <DecorBg variant="diagonals" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={80} />
            <View style={styles.insightIcon}>
              <Ionicons name={insight.icon} size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.insightText}>{insight.text}</Text>
          </View>

          {/* ── Quick actions ── */}
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.actionsRow}>
            <ActionTile
              icon="arrow-down-circle-outline"
              label="Nouveau dépôt"
              onPress={() => router.push('/(collector)/(tabs)/deposits/initiate')}
            />
            <ActionTile
              icon="arrow-up-circle-outline"
              label="Retrait"
              onPress={() => router.push('/(collector)/(tabs)/withdrawals')}
            />
            <ActionTile
              icon="person-add-outline"
              label="Nouveau client"
              onPress={() => router.push('/(collector)/(tabs)/clients/add')}
            />
          </View>

          {/* ── Hourly pulse ── */}
          <View style={styles.pulseCard}>
            <DecorBg variant="grid" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={140} />
            <View style={styles.pulseHeader}>
              <View>
                <Text style={styles.pulseTitle}>Rythme du jour</Text>
                <Text style={styles.pulseSub}>Dépôts par heure · 8h–18h</Text>
              </View>
              <View style={styles.pulseLegendRow}>
                <View style={styles.pulseLegendItem}>
                  <View style={[styles.pulseLegendDot, { backgroundColor: NEUTRAL.ink }]} />
                  <Text style={styles.pulseLegendText}>Dépôts</Text>
                </View>
                <View style={styles.pulseLegendItem}>
                  <View style={[styles.pulseLegendDot, styles.pulseLegendDotNow]} />
                  <Text style={styles.pulseLegendText}>Maintenant</Text>
                </View>
              </View>
            </View>
            <HourlyPulse transactions={recent} startHour={8} endHour={18} height={60} />
          </View>

          {/* ── Coverage + ticket row ── */}
          <View style={styles.statsRow}>
            <View style={styles.coverageCard}>
              <DecorBg variant="dots" anchor="top-right" color={COLORS.primary} opacity={0.1} width={70} height={70} />
              <Text style={styles.cardLabel}>Couverture clients</Text>
              <View style={styles.coverageInner}>
                <CoverageRing
                  value={visitedToday}
                  max={totalClients || 1}
                  size={92}
                  strokeWidth={8}
                  label="visités"
                  progressColor={COLORS.primary}
                />
              </View>
            </View>

            <View style={styles.ticketCard}>
              <DecorBg variant="arc" anchor="bottom-right" color={COLORS.primary} opacity={0.1} width={120} height={120} />
              <Text style={styles.cardLabel}>Ticket moyen</Text>
              <Text style={styles.ticketValue}>{fmtAmount(avgTicket)}</Text>
              <Text style={styles.ticketSub}>par dépôt aujourd'hui</Text>
              <View style={styles.ticketDivider} />
              <View style={styles.ticketMonthRow}>
                <View>
                  <Text style={styles.ticketMonthLabel}>Dépôts (mois)</Text>
                  <Text style={styles.ticketMonthValue}>
                    {fmtCompact(stats?.month.deposits.amount ?? 0)} FCFA
                  </Text>
                </View>
                <View>
                  <Text style={styles.ticketMonthLabel}>Retraits (mois)</Text>
                  <Text style={styles.ticketMonthValue}>
                    {fmtCompact(stats?.month.withdrawals?.amount ?? 0)} FCFA
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Recent activity preview ── */}
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
              <EmptyActivity />
            ) : (
              recent.slice(0, 4).map((tx, idx) => (
                <ActivityRow
                  key={tx.id}
                  isFirst={idx === 0}
                  tx={tx}
                  onPress={() => setOpenedTx(tx)}
                />
              ))
            )}
          </View>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </SafeAreaView>

      {/* Bottom sheet: full transactions list */}
      <TransactionsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        showCollector={false}
      />

      <TransactionDetailSheet
        transaction={openedTx}
        visible={!!openedTx}
        onClose={() => setOpenedTx(null)}
      />
    </>
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
      <Circle
        cx={c}
        cy={c}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
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

function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionTile}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionTileIcon}>
        <Ionicons name={icon} size={20} color={NEUTRAL.ink} />
      </View>
      <Text style={styles.actionTileLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActivityRow({
  tx,
  isFirst,
  onPress,
}: {
  tx: Transaction;
  isFirst?: boolean;
  onPress?: () => void;
}) {
  const isDeposit = tx.type === 'DEPOSIT';
  const dateLabel = formatRelativeDate(tx.createdAt);
  const clientName = tx.client
    ? `${tx.client.firstName} ${tx.client.lastName}`
    : 'Client';
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
      accessibilityLabel={`${
        isDeposit ? 'Dépôt' : 'Retrait'
      } de ${fmtAmount(tx.amount)} pour ${clientName}, ${dateLabel}`}
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
          {clientName}
        </Text>
        <Text style={styles.activitySub}>
          {isDeposit ? 'Dépôt' : 'Retrait'} · {dateLabel}
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
                style={[styles.activityBadge, { backgroundColor: '#fef3c7' }]}
              >
                <Text style={[styles.activityBadgeText, { color: '#92400e' }]}>
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
        {isDeposit ? '+' : '−'} {fmtAmount(tx.amount)}
      </Text>
    </Pressable>
  );
}

function EmptyActivity() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="document-text-outline" size={20} color={NEUTRAL.inkSoft} />
      </View>
      <Text style={styles.emptyTitle}>Aucune opération récente</Text>
      <Text style={styles.emptyDesc}>
        Vos prochains dépôts et retraits apparaîtront ici.
      </Text>
    </View>
  );
}

// ──────────────── Helpers ────────────────

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function buildInsight({
  todayAmount,
  todayCount,
  targetRatio,
  hour,
}: {
  todayAmount: number;
  todayCount: number;
  targetRatio: number;
  hour: number;
}): { text: string; icon: keyof typeof Ionicons.glyphMap } {
  if (todayCount === 0) {
    if (hour < 12)
      return { text: 'Bonne journée pour démarrer la collecte.', icon: 'sunny-outline' };
    if (hour < 18)
      return { text: 'Aucune opération encore — vos clients vous attendent.', icon: 'walk-outline' };
    return { text: 'Journée tranquille. À demain !', icon: 'moon-outline' };
  }
  if (targetRatio >= 1) {
    return { text: `Objectif atteint avec ${todayCount} dépôts. Excellent !`, icon: 'checkmark-circle-outline' };
  }
  if (targetRatio >= 0.6) {
    return { text: `Bon rythme — encore ${Math.round((1 - targetRatio) * 100)}% pour l'objectif.`, icon: 'trending-up-outline' };
  }
  if (hour > 14) {
    return { text: 'Après-midi en cours — quelques visites de plus pour rattraper.', icon: 'time-outline' };
  }
  return { text: `${todayCount} ${todayCount > 1 ? 'dépôts collectés' : 'dépôt collecté'} — la journée commence bien.`, icon: 'trending-up-outline' };
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NEUTRAL.bg,
  },
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

  // Hero card
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
  heroLeft: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroAmountRow: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 6,
  },
  heroAmount: {
    color: NEUTRAL.inkOnFill,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10,
  },
  heroFooterText: {
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

  // Insight
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde0e0',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: NEUTRAL.ink,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Sections
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: NEUTRAL.ink,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
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
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Quick actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  actionTile: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    alignItems: 'flex-start',
    minHeight: 88,
    justifyContent: 'space-between',
  },
  actionTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: NEUTRAL.ink,
    marginTop: 10,
    lineHeight: 16,
  },

  // Pulse card
  pulseCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  pulseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pulseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    letterSpacing: 0.1,
  },
  pulseSub: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  pulseLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  pulseLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pulseLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseLegendDotNow: {
    backgroundColor: NEUTRAL.fill,
    borderWidth: 1.5,
    borderColor: NEUTRAL.ink,
  },
  pulseLegendText: { fontSize: 10, color: NEUTRAL.inkMid, fontWeight: '600' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  coverageCard: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  coverageInner: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  cardLabel: {
    fontSize: 12,
    color: NEUTRAL.inkMid,
    fontWeight: '500',
  },
  ticketCard: {
    flex: 1.3,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  ticketValue: {
    fontSize: 20,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  ticketSub: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: NEUTRAL.borderSoft,
    marginVertical: 12,
  },
  ticketMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ticketMonthLabel: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  ticketMonthValue: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },

  // Activity card
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
  activityName: {
    fontSize: 13,
    fontWeight: '600',
    color: NEUTRAL.ink,
  },
  activitySub: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },
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

  // Empty state
  emptyState: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  emptyIconWrap: {
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
