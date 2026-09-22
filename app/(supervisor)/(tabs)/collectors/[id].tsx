import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/api-client';
import { useTransactions } from '../../../../hooks/useTransactions';
import { TransactionDetailSheet } from '../../../../components/transactions/TransactionDetailSheet';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import {
  Transaction,
  TransactionType,
} from '../../../../types/transaction.types';

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

interface CollectorDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  branch?: { name: string; city: string } | null;
  zones?: { id: string; name: string }[];
  _count?: { clients: number; collectorTransactions: number };
}

interface Performance {
  totalClients: number;
  deposits: { count: number; total: number };
  withdrawals: { count: number; total: number };
}

export default function CollectorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [sortDir, setSortDir] = useState<'DESC' | 'ASC'>('DESC');
  const [openedTx, setOpenedTx] = useState<Transaction | null>(null);

  const { data: user, isLoading } = useQuery<CollectorDetail>({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${id}`);
      return data.data || data;
    },
    enabled: !!id,
  });

  const { data: performance } = useQuery<Performance>({
    queryKey: ['users', id, 'performance'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${id}/performance`);
      return data.data || data;
    },
    enabled: !!id,
  });

  const { data: txData, isFetching: txFetching } = useTransactions({
    collectorId: id,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    limit: 100,
  });

  const sortedTxs = useMemo(() => {
    const items = txData?.transactions ?? [];
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sortDir === 'DESC' ? sorted : sorted.reverse();
  }, [txData, sortDir]);

  if (isLoading || !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const netFlow =
    (performance?.deposits.total ?? 0) - (performance?.withdrawals.total ?? 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.heroCard}>
        <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={240} height={240} />
        <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={140} height={100} />
        <View style={styles.heroTop}>
          <View style={[styles.heroAvatar, !user.isActive && { opacity: 0.5 }]}>
            <Text style={styles.heroAvatarText}>{initials || '·'}</Text>
          </View>
          <View style={styles.heroIdentity}>
            <Text style={styles.heroName} numberOfLines={1}>
              {user.firstName} {user.lastName}
            </Text>
            <View style={styles.heroChips}>
              <View style={styles.heroChip}>
                <Ionicons name="briefcase" size={10} color={NEUTRAL.inkOnFill} />
                <Text style={styles.heroChipText}>Collecteur</Text>
              </View>
              {user.branch && (
                <View style={styles.heroChip}>
                  <Ionicons name="business" size={10} color={NEUTRAL.inkOnFill} />
                  <Text style={styles.heroChipText} numberOfLines={1}>
                    {user.branch.name}
                  </Text>
                </View>
              )}
              {!user.isActive && (
                <View style={[styles.heroChip, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <Text style={styles.heroChipText}>Inactif</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* KPI grid */}
      {performance && (
        <View style={styles.kpiGrid}>
          <KpiTile
            icon="people"
            label="Clients"
            value={String(performance.totalClients)}
            sub="suivis"
            decor="dots"
          />
          <KpiTile
            icon="arrow-down"
            label="Dépôts"
            value={fmtCompact(performance.deposits.total)}
            sub={`${performance.deposits.count} opérations`}
            decor="arc"
          />
          <KpiTile
            icon="arrow-up"
            label="Retraits"
            value={fmtCompact(performance.withdrawals.total)}
            sub={`${performance.withdrawals.count} opérations`}
            decor="dots"
          />
          <KpiTile
            icon="trending-up"
            label="Solde net"
            value={`${netFlow >= 0 ? '+' : '−'} ${fmtCompact(Math.abs(netFlow))}`}
            sub="FCFA"
            decor="arc"
            highlight={netFlow >= 0}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Coordonnées</Text>
      <View style={styles.cardList}>
        <DetailRow icon="mail" label="E-mail" value={user.email} isFirst />
        <DetailRow icon="call" label="Téléphone" value={user.phone} />
        {user.branch && (
          <DetailRow
            icon="business"
            label="Branche"
            value={`${user.branch.name} · ${user.branch.city}`}
          />
        )}
        {user.zones && user.zones.length > 0 && (
          <DetailRow
            icon="map"
            label="Zones"
            value={user.zones.map((z) => z.name).join(' · ')}
          />
        )}
        <DetailRow
          icon="finger-print"
          label="Identifiant"
          value={user.id.slice(0, 12).toUpperCase()}
          mono
        />
      </View>

      {/* ── Transaction history ── */}
      <View style={styles.txHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Historique des opérations</Text>
          <Text style={styles.sectionSub}>
            {sortedTxs.length} opération{sortedTxs.length > 1 ? 's' : ''}
            {txFetching ? ' · …' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortDir((d) => (d === 'DESC' ? 'ASC' : 'DESC'))}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={`Trier par date ${sortDir === 'DESC' ? 'croissante' : 'décroissante'}`}
        >
          <Ionicons
            name={sortDir === 'DESC' ? 'arrow-down' : 'arrow-up'}
            size={11}
            color={NEUTRAL.ink}
          />
          <Text style={styles.sortBtnText}>
            {sortDir === 'DESC' ? 'Plus récent' : 'Plus ancien'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type filter pills */}
      <View style={styles.typeFilterRow}>
        {(
          [
            { key: 'ALL', label: 'Toutes', icon: 'list' },
            { key: 'DEPOSIT', label: 'Dépôts', icon: 'arrow-down' },
            { key: 'WITHDRAWAL', label: 'Retraits', icon: 'arrow-up' },
          ] as const
        ).map((f) => {
          const active = typeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.typePill, active && styles.typePillActive]}
              onPress={() => setTypeFilter(f.key)}
              activeOpacity={0.78}
            >
              <Ionicons
                name={f.icon as any}
                size={11}
                color={active ? NEUTRAL.inkOnFill : NEUTRAL.inkMid}
              />
              <Text
                style={[
                  styles.typePillText,
                  active && styles.typePillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {sortedTxs.length === 0 ? (
        <View style={styles.txEmpty}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={NEUTRAL.inkSoft}
            />
          </View>
          <Text style={styles.txEmptyTitle}>
            {typeFilter === 'DEPOSIT'
              ? 'Aucun dépôt'
              : typeFilter === 'WITHDRAWAL'
                ? 'Aucun retrait'
                : 'Aucune opération'}
          </Text>
          <Text style={styles.txEmptyDesc}>
            Les opérations effectuées par ce collecteur apparaîtront ici.
          </Text>
        </View>
      ) : (
        <View style={styles.txList}>
          {sortedTxs.map((tx, idx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              isFirst={idx === 0}
              onPress={() => setOpenedTx(tx)}
            />
          ))}
        </View>
      )}

      <View style={{ height: SPACING.xxl }} />

      <TransactionDetailSheet
        transaction={openedTx}
        visible={!!openedTx}
        onClose={() => setOpenedTx(null)}
      />
    </ScrollView>
  );
}

function TxRow({
  tx,
  isFirst,
  onPress,
}: {
  tx: Transaction;
  isFirst: boolean;
  onPress: () => void;
}) {
  const isDeposit = tx.type === 'DEPOSIT';
  const date = new Date(tx.createdAt);
  const dateLabel = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeLabel = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
        styles.txRow,
        !isFirst && styles.txRowDivider,
        pressed && { backgroundColor: NEUTRAL.surfaceAlt },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.txRowIcon,
          { backgroundColor: isDeposit ? '#dcfce7' : '#fee2e2' },
        ]}
      >
        <Ionicons
          name={isDeposit ? 'arrow-down' : 'arrow-up'}
          size={14}
          color={isDeposit ? '#15803d' : COLORS.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txRowName} numberOfLines={1}>
          {tx.client?.firstName} {tx.client?.lastName}
        </Text>
        <Text style={styles.txRowSub} numberOfLines={1}>
          {dateLabel} · {timeLabel}
          {methodLabel ? ` · ${methodLabel}` : ''}
        </Text>
      </View>
      <Text
        style={[
          styles.txRowAmount,
          { color: isDeposit ? '#15803d' : COLORS.primary },
        ]}
      >
        {isDeposit ? '+' : '−'} {fmtAmount(tx.amount)}
      </Text>
    </Pressable>
  );
}

function KpiTile({
  icon,
  label,
  value,
  sub,
  decor,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  decor: 'dots' | 'arc';
  highlight?: boolean;
}) {
  return (
    <View style={[styles.kpiTile, highlight && styles.kpiTileHighlight]}>
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

function DetailRow({
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
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={14} color={NEUTRAL.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text
          style={[
            styles.rowValue,
            mono && { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: NEUTRAL.bg },
  scrollContent: { padding: SPACING.md },
  loading: {
    flex: 1,
    backgroundColor: NEUTRAL.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
    borderColor: '#A5D6A7',
    backgroundColor: '#F1F8E9',
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  cardList: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowValue: { fontSize: 13, fontWeight: '600', color: NEUTRAL.ink },

  // ── Transaction history ──
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 1 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
  },
  sortBtnText: { fontSize: 11, fontWeight: '700', color: NEUTRAL.ink },

  typeFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
  },
  typePillActive: {
    backgroundColor: NEUTRAL.fill,
    borderColor: NEUTRAL.fill,
  },
  typePillText: { fontSize: 11, fontWeight: '600', color: NEUTRAL.inkMid },
  typePillTextActive: { color: NEUTRAL.inkOnFill },

  txList: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
  },
  txRowDivider: { borderTopWidth: 1, borderTopColor: NEUTRAL.borderSoft },
  txRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txRowName: { fontSize: 13, fontWeight: '600', color: NEUTRAL.ink },
  txRowSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  txRowAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  txEmpty: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  txEmptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: NEUTRAL.ink,
    marginTop: 8,
    marginBottom: 4,
  },
  txEmptyDesc: { fontSize: 11, color: NEUTRAL.inkSoft, textAlign: 'center' },
});
