import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useAuthStore } from '../../../stores/auth.store';
import { useDashboardStats, useRecentActivity } from '../../../hooks/useDashboard';
import { useClients } from '../../../hooks/useClients';
import { DecorBg } from '../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { Transaction } from '../../../types/transaction.types';

const MONTHLY_TARGET_FCFA = 4_000_000;
const dayShortFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const monthFr = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

const roleLabel = (role?: string) =>
  role === 'COLLECTOR' ? 'Collecteur' :
  role === 'SUPERVISOR' ? 'Superviseur' :
  role === 'ADMIN' ? 'Administrateur' : 'Membre';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { data: stats, isFetching, refetch: refetchStats } = useDashboardStats();
  const { data: recent, refetch: refetchRecent } = useRecentActivity(80);
  const { data: clients, refetch: refetchClients } = useClients();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  // ── Derived metrics ─────────────────────────────────
  const monthAmount = stats?.month.deposits.amount ?? 0;
  const monthCount = stats?.month.deposits.count ?? 0;
  const todayCount = stats?.today.deposits.count ?? 0;
  const totalClients = stats?.totalClients ?? clients?.length ?? 0;
  const monthRatio = Math.min(monthAmount / MONTHLY_TARGET_FCFA, 1);
  const monthPct = Math.round(monthRatio * 100);

  // Activity split: deposits vs withdrawals on the last 7 days
  const split = useMemo(() => buildSevenDaySplit(recent ?? []), [recent]);
  const maxSplit = Math.max(...split.flatMap((d) => [d.dep, d.wit]), 1);
  const totalDep7 = split.reduce((a, b) => a + b.dep, 0);
  const totalWit7 = split.reduce((a, b) => a + b.wit, 0);

  // Active client streak: how many distinct clients deposited this week
  const activeClientsThisWeek = useMemo(() => {
    if (!recent) return 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    const ids = new Set<string>();
    recent.forEach((tx) => {
      if (tx.type !== 'DEPOSIT') return;
      if (new Date(tx.createdAt) < cutoff) return;
      ids.add(tx.clientId);
    });
    return ids.size;
  }, [recent]);

  // Collector "level" — gamification based on month FCFA
  const level = useMemo(() => computeLevel(monthAmount), [monthAmount]);

  // Achievements
  const achievements = useMemo(
    () => buildAchievements({
      monthAmount,
      monthCount,
      totalClients,
      activeClientsThisWeek,
      todayCount,
    }),
    [monthAmount, monthCount, totalClients, activeClientsThisWeek, todayCount],
  );

  const now = new Date();
  const monthLabel = monthFr[now.getMonth()];

  const onRefresh = async () => {
    await Promise.all([refetchStats(), refetchRecent(), refetchClients()]);
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={NEUTRAL.ink}
          />
        }
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View style={styles.iconBtn}>
            <Ionicons name="person" size={20} color={NEUTRAL.ink} />
          </View>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Mon espace</Text>
            <Text style={styles.topBarTitle}>Profil</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert('Bientôt disponible', 'Les paramètres avancés arrivent prochainement.')}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={18} color={NEUTRAL.ink} />
          </TouchableOpacity>
        </View>

        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={240} height={240} />
          <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={140} height={100} />

          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{initials || '·'}</Text>
              <View style={styles.heroAvatarBadge}>
                <Ionicons name="shield-checkmark" size={10} color={NEUTRAL.inkOnFill} />
              </View>
            </View>
            <View style={styles.heroIdentity}>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.firstName} {user?.lastName}
              </Text>
              <View style={styles.heroChips}>
                <View style={styles.heroChip}>
                  <Ionicons name="briefcase" size={10} color={NEUTRAL.inkOnFill} />
                  <Text style={styles.heroChipText}>{roleLabel(user?.role)}</Text>
                </View>
                {user?.branchId && (
                  <View style={styles.heroChip}>
                    <Ionicons name="business" size={10} color={NEUTRAL.inkOnFill} />
                    <Text style={styles.heroChipText}>Agence</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroLevelRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLevelLabel}>Niveau · {level.name}</Text>
              <View style={styles.heroBarTrack}>
                <View
                  style={[
                    styles.heroBarFill,
                    { width: `${Math.round(level.progress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.heroLevelHint}>
                {level.next
                  ? `${fmtCompact(level.toNext)} FCFA pour ${level.next}`
                  : 'Niveau maximum atteint'}
              </Text>
            </View>
            <View style={styles.heroLevelBadge}>
              <Ionicons name={level.icon} size={20} color={NEUTRAL.inkOnFill} />
            </View>
          </View>
        </View>

        {/* ── Monthly target with ring ── */}
        <View style={styles.targetCard}>
          <DecorBg variant="grid" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={200} />
          <View style={styles.targetText}>
            <Text style={styles.cardOver}>Objectif {monthLabel}</Text>
            <Text style={styles.targetAmount}>{fmtAmount(monthAmount)}</Text>
            <Text style={styles.targetSub}>
              sur {fmtCompact(MONTHLY_TARGET_FCFA)} FCFA · {monthCount} dépôts
            </Text>
            <View style={styles.targetMetaRow}>
              <View style={styles.targetMetaItem}>
                <Ionicons name="trending-up" size={12} color={COLORS.primary} />
                <Text style={styles.targetMetaText}>
                  {monthPct >= 100 ? 'Objectif atteint' : `${monthPct}% complété`}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.targetRingWrap}>
            <ProgressArc
              ratio={monthRatio}
              size={108}
              strokeWidth={10}
              trackColor={NEUTRAL.surfaceSunken}
              progressColor={COLORS.primary}
            />
            <View style={styles.targetRingCenter} pointerEvents="none">
              <Text style={styles.targetRingPct}>{monthPct}%</Text>
              <Text style={styles.targetRingLabel}>du mois</Text>
            </View>
          </View>
        </View>

        {/* ── KPI grid ── */}
        <View style={styles.kpiGrid}>
          <KpiTile
            icon="people"
            label="Clients"
            value={String(totalClients)}
            sub="actifs"
            decor="dots"
          />
          <KpiTile
            icon="flame"
            label="Cette semaine"
            value={String(activeClientsThisWeek)}
            sub="clients vus"
            decor="arc"
          />
          <KpiTile
            icon="cash"
            label="Mois"
            value={fmtCompact(monthAmount)}
            sub="FCFA collectés"
            decor="dots"
          />
          <KpiTile
            icon="trophy"
            label="Niveau"
            value={level.short}
            sub={level.name}
            decor="arc"
          />
        </View>

        {/* ── Activity chart ── */}
        <View style={styles.chartCard}>
          <DecorBg variant="diagonals" anchor="fill" color={COLORS.primary} opacity={0.03} width={400} height={220} />
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
              <Text style={styles.chartFooterLabel}>Dépôts (7j)</Text>
              <Text style={styles.chartFooterValue}>
                {fmtCompact(totalDep7)} FCFA
              </Text>
            </View>
            <View style={styles.chartFooterDivider} />
            <View style={styles.chartFooterItem}>
              <Text style={styles.chartFooterLabel}>Retraits (7j)</Text>
              <Text style={styles.chartFooterValue}>
                {fmtCompact(totalWit7)} FCFA
              </Text>
            </View>
            <View style={styles.chartFooterDivider} />
            <View style={styles.chartFooterItem}>
              <Text style={styles.chartFooterLabel}>Solde net</Text>
              <Text
                style={[
                  styles.chartFooterValue,
                  { color: totalDep7 >= totalWit7 ? '#2E7D32' : COLORS.error },
                ]}
              >
                {totalDep7 >= totalWit7 ? '+' : '−'}{' '}
                {fmtCompact(Math.abs(totalDep7 - totalWit7))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Achievements ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Distinctions</Text>
          <Text style={styles.sectionCount}>
            {achievements.filter((a) => a.unlocked).length}/{achievements.length}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementRow}
        >
          {achievements.map((a) => (
            <View
              key={a.id}
              style={[styles.achievementCard, !a.unlocked && styles.achievementLocked]}
            >
              <View
                style={[
                  styles.achievementIcon,
                  a.unlocked
                    ? { backgroundColor: a.color + '22', borderColor: a.color + '44' }
                    : { backgroundColor: NEUTRAL.surfaceSunken, borderColor: NEUTRAL.borderSoft },
                ]}
              >
                <Ionicons
                  name={a.icon}
                  size={18}
                  color={a.unlocked ? a.color : NEUTRAL.inkSoft}
                />
              </View>
              <Text
                style={[
                  styles.achievementName,
                  !a.unlocked && { color: NEUTRAL.inkSoft },
                ]}
                numberOfLines={1}
              >
                {a.name}
              </Text>
              <Text style={styles.achievementDesc} numberOfLines={2}>
                {a.desc}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Contact section ── */}
        <Text style={styles.sectionTitle}>Coordonnées</Text>
        <View style={styles.cardList}>
          <ContactRow
            icon="mail"
            label="Adresse e-mail"
            value={user?.email || '—'}
            isFirst
          />
          <ContactRow icon="call" label="Téléphone" value={user?.phone || '—'} />
          <ContactRow
            icon="finger-print"
            label="Identifiant"
            value={user?.id ? user.id.slice(0, 8).toUpperCase() : '—'}
            mono
          />
        </View>

        {/* ── Settings list ── */}
        <Text style={styles.sectionTitle}>Paramètres</Text>
        <View style={styles.cardList}>
          <SettingsRow
            icon="document-text"
            label="Rapport mensuel"
            sub="Téléchargez vos transactions du mois"
            onPress={() => router.push('/(collector)/reports')}
            isFirst
          />
          <SettingsRow
            icon="lock-closed"
            label="Sécurité"
            sub="Mot de passe et authentification"
            onPress={() => Alert.alert('Bientôt disponible', 'La gestion de la sécurité arrive prochainement.')}
          />
          <SettingsRow
            icon="notifications"
            label="Notifications"
            sub="Alertes et rappels"
            onPress={() => Alert.alert('Bientôt disponible', 'Les paramètres de notification arrivent prochainement.')}
          />
          <SettingsRow
            icon="globe-outline"
            label="Langue"
            sub="Français"
            onPress={() => Alert.alert('Bientôt disponible', 'Le multilingue arrive prochainement.')}
          />
          <SettingsRow
            icon="help-circle"
            label="Aide & support"
            sub="Centre d'assistance Crea Invest"
            onPress={() => Alert.alert('Support', 'Contactez votre superviseur pour toute assistance.')}
          />
          <SettingsRow
            icon="document"
            label="Conditions & confidentialité"
            sub="Mentions légales"
            onPress={() => router.push('/(auth)/terms')}
          />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={16} color={COLORS.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Crea Invest · v1.0.0</Text>

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

function KpiTile({
  icon,
  label,
  value,
  sub,
  decor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  decor: 'dots' | 'arc';
}) {
  return (
    <View style={styles.kpiTile}>
      <DecorBg
        variant={decor}
        anchor={decor === 'dots' ? 'top-right' : 'bottom-right'}
        color={COLORS.primary}
        opacity={decor === 'dots' ? 0.08 : 0.1}
        width={decor === 'dots' ? 70 : 110}
        height={decor === 'dots' ? 70 : 110}
      />
      <View style={styles.kpiTileIcon}>
        <Ionicons name={icon} size={14} color={COLORS.primary} />
      </View>
      <Text style={styles.kpiTileLabel}>{label}</Text>
      <Text style={styles.kpiTileValue}>{value}</Text>
      <Text style={styles.kpiTileSub}>{sub}</Text>
    </View>
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

function ContactRow({
  icon,
  label,
  value,
  mono,
  isFirst,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  mono?: boolean;
  isFirst?: boolean;
}) {
  return (
    <View style={[styles.listRow, !isFirst && styles.listRowDivider]}>
      <View style={styles.listIconWrap}>
        <Ionicons name={icon} size={14} color={NEUTRAL.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listLabel}>{label}</Text>
        <Text
          style={[
            styles.listValue,
            mono && { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sub,
  onPress,
  isFirst,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
  isFirst?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.listRow, !isFirst && styles.listRowDivider]}
    >
      <View style={styles.listIconWrap}>
        <Ionicons name={icon} size={14} color={NEUTRAL.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listLabel}>{label}</Text>
        <Text style={styles.listSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={NEUTRAL.inkSoft} />
    </TouchableOpacity>
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
    if (tx.type === 'DEPOSIT') slot.dep += tx.amount;
    else if (tx.type === 'WITHDRAWAL') slot.wit += tx.amount;
  });
  return days.map(({ day, dep, wit, isToday }) => ({ day, dep, wit, isToday }));
}

interface LevelInfo {
  name: string;
  short: string;
  icon: keyof typeof Ionicons.glyphMap;
  progress: number;
  next: string | null;
  toNext: number;
}

function computeLevel(monthAmount: number): LevelInfo {
  const tiers: { min: number; name: string; short: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { min: 0,         name: 'Bronze',     short: 'III', icon: 'medal-outline' },
    { min: 500_000,   name: 'Argent',     short: 'II',  icon: 'medal' },
    { min: 1_500_000, name: 'Or',         short: 'I',   icon: 'trophy' },
    { min: 3_000_000, name: 'Platine',    short: 'P',   icon: 'diamond' },
    { min: 5_000_000, name: 'Diamant',    short: 'D',   icon: 'star' },
  ];
  let idx = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (monthAmount >= tiers[i].min) {
      idx = i;
      break;
    }
  }
  const current = tiers[idx];
  const next = tiers[idx + 1];
  if (!next) {
    return {
      name: current.name,
      short: current.short,
      icon: current.icon,
      progress: 1,
      next: null,
      toNext: 0,
    };
  }
  const span = next.min - current.min;
  const progress = span > 0 ? Math.min((monthAmount - current.min) / span, 1) : 0;
  return {
    name: current.name,
    short: current.short,
    icon: current.icon,
    progress,
    next: next.name,
    toNext: Math.max(next.min - monthAmount, 0),
  };
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  unlocked: boolean;
}

function buildAchievements({
  monthAmount,
  monthCount,
  totalClients,
  activeClientsThisWeek,
  todayCount,
}: {
  monthAmount: number;
  monthCount: number;
  totalClients: number;
  activeClientsThisWeek: number;
  todayCount: number;
}): Achievement[] {
  return [
    {
      id: 'first-deposit',
      name: 'Premier dépôt',
      desc: 'Effectuez votre 1er dépôt',
      icon: 'flag',
      color: '#1E88E5',
      unlocked: monthCount >= 1,
    },
    {
      id: 'streak',
      name: 'Régularité',
      desc: '5 clients vus cette semaine',
      icon: 'flame',
      color: '#FB8C00',
      unlocked: activeClientsThisWeek >= 5,
    },
    {
      id: 'hundred',
      name: '100 dépôts',
      desc: '100 dépôts ce mois',
      icon: 'rocket',
      color: '#7B1FA2',
      unlocked: monthCount >= 100,
    },
    {
      id: 'million',
      name: 'Million',
      desc: '1M FCFA collectés',
      icon: 'cash',
      color: '#2E7D32',
      unlocked: monthAmount >= 1_000_000,
    },
    {
      id: 'portfolio',
      name: 'Portefeuille',
      desc: '20 clients actifs',
      icon: 'people',
      color: '#C62828',
      unlocked: totalClients >= 20,
    },
    {
      id: 'daily',
      name: 'Tournée',
      desc: '5 dépôts en 1 jour',
      icon: 'walk',
      color: '#00838F',
      unlocked: todayCount >= 5,
    },
  ];
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

  // Hero
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: NEUTRAL.inkOnFill,
    letterSpacing: 0.5,
  },
  heroAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: NEUTRAL.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  heroIdentity: { flex: 1 },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: NEUTRAL.inkOnFill,
    letterSpacing: -0.3,
  },
  heroChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroChipText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 14,
  },
  heroLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroLevelLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginTop: 8,
  },
  heroBarFill: {
    height: '100%',
    backgroundColor: NEUTRAL.inkOnFill,
    borderRadius: 4,
  },
  heroLevelHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 6,
  },
  heroLevelBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  // Target card
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  targetText: { flex: 1 },
  cardOver: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  targetAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: NEUTRAL.ink,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  targetSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  targetMetaRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  targetMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#fff1f1',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: '#fde0e0',
  },
  targetMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  targetRingWrap: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetRingCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetRingPct: {
    fontSize: 22,
    fontWeight: '800',
    color: NEUTRAL.ink,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  targetRingLabel: {
    fontSize: 9,
    color: NEUTRAL.inkSoft,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  kpiTileLabel: { fontSize: 10, color: NEUTRAL.inkMid, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
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

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 10,
    marginTop: SPACING.sm,
    letterSpacing: 0.1,
  },
  sectionCount: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  // Achievements
  achievementRow: {
    gap: 10,
    paddingBottom: 6,
    paddingRight: SPACING.md,
  },
  achievementCard: {
    width: 130,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
  },
  achievementLocked: { opacity: 0.6 },
  achievementIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '700',
    color: NEUTRAL.ink,
  },
  achievementDesc: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
    lineHeight: 14,
  },

  // List rows
  cardList: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  listRowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  listIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLabel: { fontSize: 13, fontWeight: '600', color: NEUTRAL.ink },
  listSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  listValue: { fontSize: 12, color: NEUTRAL.inkMid, marginTop: 2 },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFEBEE',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: COLORS.error, letterSpacing: 0.2 },
  versionText: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

const splitStyles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
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
  labelsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
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
