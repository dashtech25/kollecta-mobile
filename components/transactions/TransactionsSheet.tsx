import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTransactions } from '../../hooks/useTransactions';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  DepositMethod,
  MomoProvider,
} from '../../types/transaction.types';
import { TransactionDetailSheet } from './TransactionDetailSheet';

interface TransactionsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Optionally filter to a single client */
  clientId?: string;
  /**
   * When set, skips opening the built-in detail sheet and forwards the tap
   * to the parent (legacy callers like the client detail screen still rely
   * on this). Default behaviour is to open the in-place detail sheet.
   */
  onTransactionPress?: (tx: Transaction) => void;
  /**
   * Render the collector + branch line in each row. Default: true for the
   * supervisor portal; collectors don't need to see their own name on every
   * row, so callers there pass `false`.
   */
  showCollector?: boolean;
}

type TypeFilter = 'ALL' | TransactionType;
type StatusFilter = 'ALL' | TransactionStatus;

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tout' },
  { key: 'DEPOSIT', label: 'Dépôts' },
  { key: 'WITHDRAWAL', label: 'Retraits' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'COMPLETED', label: 'Terminées' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'FAILED', label: 'Échouées' },
  { key: 'CANCELLED', label: 'Annulées' },
];

const STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  FAILED: 'Échouée',
};

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

/**
 * Banking-grade transactions list bottom sheet.
 *
 * Built on React Native's native Modal (rather than @gorhom/bottom-sheet) for
 * superior accessibility: native focus trap, hardware back-button handling,
 * VoiceOver / TalkBack announcement of "modal opened", and Escape key on Android.
 *
 *  - Search by client name / phone / note (server-side, debounced)
 *  - Type chips: All / Deposits / Withdrawals
 *  - Status chips: All / Terminées / En attente / Échouées / Annulées
 *  - Totals header (deposits/withdrawals/net)
 *  - Section list grouped by date (Aujourd'hui / Hier / earlier)
 *  - Tap a row → in-place detail sheet (or forward to caller)
 */
export function TransactionsSheet({
  visible,
  onClose,
  clientId,
  onTransactionPress,
  showCollector = true,
}: TransactionsSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const [type, setType] = useState<TypeFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [openedTx, setOpenedTx] = useState<Transaction | null>(null);

  // Debounce server-side search so we don't hit the API on every keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useTransactions({
    clientId,
    type: type === 'ALL' ? undefined : type,
    status: status === 'ALL' ? undefined : status,
    search: searchDebounced || undefined,
    limit: 100,
  });

  const sections = useMemo(() => {
    return groupByDate(data?.transactions ?? []);
  }, [data]);

  const totals = data?.totals;
  const totalCount = data?.transactions.length ?? 0;

  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, backdropOpacity]);

  const handleClose = useCallback(() => {
    setSearch('');
    setSearchDebounced('');
    onClose();
  }, [onClose]);

  const handlePressTx = useCallback(
    (tx: Transaction) => {
      if (onTransactionPress) {
        onTransactionPress(tx);
        return;
      }
      setOpenedTx(tx);
    },
    [onTransactionPress],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
      hardwareAccelerated
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer la liste des transactions"
          />
        </Animated.View>

        {/* Sheet container */}
        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.sheet,
            {
              maxHeight: screenHeight * 0.95,
              minHeight: screenHeight * 0.7,
            },
          ]}
        >
          {/* Drag handle (visual cue) */}
          <View style={styles.handleZone} accessibilityElementsHidden importantForAccessibility="no">
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerMeta}>
              <Text style={styles.title}>Toutes les transactions</Text>
              <Text style={styles.subtitle}>
                {totalCount} {totalCount > 1 ? 'opérations affichées' : 'opération affichée'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={20} color={NEUTRAL.ink} />
            </TouchableOpacity>
          </View>

          {/* Totals row */}
          {totals && (
            <View style={styles.totalsRow}>
              <TotalCard
                label="Dépôts"
                amount={totals.deposits.amount}
                count={totals.deposits.count}
                icon="arrow-down-circle"
                tint="#15803d"
              />
              <TotalCard
                label="Retraits"
                amount={totals.withdrawals.amount}
                count={totals.withdrawals.count}
                icon="arrow-up-circle"
                tint={COLORS.primary}
              />
              <TotalCard
                label="Net"
                amount={totals.deposits.amount - totals.withdrawals.amount}
                count={totals.deposits.count + totals.withdrawals.count}
                icon="trending-up"
                tint={NEUTRAL.ink}
                signed
              />
            </View>
          )}

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={NEUTRAL.inkSoft} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher client, téléphone, collecteur…"
              placeholderTextColor={NEUTRAL.inkSoft}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Champ de recherche"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
              >
                <Ionicons name="close-circle" size={16} color={NEUTRAL.inkSoft} />
              </TouchableOpacity>
            )}
          </View>

          {/* Type filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
            accessibilityRole="tablist"
            accessibilityLabel="Filtrer par type"
          >
            {TYPE_FILTERS.map((f) => {
              const active = type === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setType(f.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={f.label}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Status filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
            accessibilityRole="tablist"
            accessibilityLabel="Filtrer par statut"
          >
            {STATUS_FILTERS.map((f) => {
              const active = status === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chipSm, active && styles.chipSmActive]}
                  onPress={() => setStatus(f.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={f.label}
                >
                  <Text style={[styles.chipSmText, active && styles.chipSmTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List */}
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={NEUTRAL.ink} />
            </View>
          ) : sections.length === 0 ? (
            <EmptyState search={searchDebounced} type={type} status={status} />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  <Text style={styles.sectionHeaderCount}>
                    {section.data.length}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TransactionRow
                  tx={item}
                  showCollector={showCollector}
                  onPress={() => handlePressTx(item)}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              contentContainerStyle={{ paddingBottom: SPACING.xxl }}
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </View>

      {/* Detail sheet (only when no caller-supplied handler) */}
      {!onTransactionPress && (
        <TransactionDetailSheet
          transaction={openedTx}
          visible={!!openedTx}
          onClose={() => setOpenedTx(null)}
        />
      )}
    </Modal>
  );
}

// ──────────────── Sub-components ────────────────

function TotalCard({
  label,
  amount,
  count,
  icon,
  tint,
  signed,
}: {
  label: string;
  amount: number;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  signed?: boolean;
}) {
  const display = signed
    ? `${amount >= 0 ? '+' : '−'} ${fmtCompact(Math.abs(amount))}`
    : fmtCompact(amount);
  return (
    <View style={styles.totalCard}>
      <View style={styles.totalCardHeader}>
        <Text style={styles.totalCardLabel}>{label}</Text>
        <View style={[styles.totalIcon, { backgroundColor: `${tint}20` }]}>
          <Ionicons name={icon} size={11} color={tint} />
        </View>
      </View>
      <Text style={styles.totalAmount}>{display}</Text>
      <Text style={styles.totalCount}>
        {count} op.
      </Text>
    </View>
  );
}

function TransactionRow({
  tx,
  onPress,
  showCollector,
}: {
  tx: Transaction;
  onPress?: () => void;
  showCollector: boolean;
}) {
  const isDeposit = tx.type === 'DEPOSIT';
  const clientName = tx.client
    ? `${tx.client.firstName} ${tx.client.lastName}`
    : 'Client';
  const time = new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const req = tx.depositRequest ?? tx.withdrawalRequest ?? null;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${
        isDeposit ? 'Dépôt' : 'Retrait'
      } de ${fmtAmount(tx.amount)} pour ${clientName} à ${time}, statut ${STATUS_LABEL[tx.status]}`}
    >
      <View
        style={[
          styles.rowAvatar,
          {
            backgroundColor: isDeposit ? '#dcfce7' : '#fee2e2',
          },
        ]}
      >
        <Ionicons
          name={isDeposit ? 'arrow-down' : 'arrow-up'}
          size={14}
          color={isDeposit ? '#15803d' : COLORS.primary}
        />
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowName} numberOfLines={1}>
          {clientName}
        </Text>
        <View style={styles.rowSubRow}>
          <Text style={styles.rowSub}>
            {isDeposit ? 'Dépôt' : 'Retrait'} · {time}
          </Text>
          {tx.client?.phone && (
            <>
              <Text style={styles.rowSubDot}>·</Text>
              <Text style={styles.rowSub}>{tx.client.phone}</Text>
            </>
          )}
        </View>
        <View style={styles.rowBadgesRow}>
          {req && (
            <MethodPill
              method={req.method}
              provider={req.momoProvider}
            />
          )}
          {tx.status !== 'COMPLETED' && (
            <StatusPill status={tx.status} />
          )}
          {showCollector && tx.collector && (
            <View style={styles.collectorPill}>
              <Ionicons name="person" size={9} color={NEUTRAL.inkMid} />
              <Text style={styles.collectorPillText} numberOfLines={1}>
                {tx.collector.firstName} {tx.collector.lastName[0]}.
                {tx.collector.branch ? ` · ${tx.collector.branch.name}` : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.rowAmountWrap}>
        <Text
          style={[
            styles.rowAmount,
            { color: isDeposit ? '#15803d' : COLORS.primary },
          ]}
        >
          {isDeposit ? '+' : '−'} {fmtAmount(tx.amount)}
        </Text>
        {tx.client?.balance !== undefined && (
          <Text style={styles.rowBalance}>
            Solde: {fmtCompact(tx.client.balance)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function MethodPill({
  method,
  provider,
}: {
  method: DepositMethod | null;
  provider: MomoProvider | null;
}) {
  if (!method) return null;
  if (method === 'CASH') {
    return (
      <View style={[styles.pill, { backgroundColor: '#fef3c7' }]}>
        <Ionicons name="cash-outline" size={9} color="#92400e" />
        <Text style={[styles.pillText, { color: '#92400e' }]}>Espèces</Text>
      </View>
    );
  }
  const label =
    provider === 'ORANGE_MONEY'
      ? 'Orange'
      : provider === 'MTN_MONEY'
        ? 'MTN'
        : 'MoMo';
  return (
    <View style={[styles.pill, { backgroundColor: '#e0e7ff' }]}>
      <Ionicons name="phone-portrait-outline" size={9} color="#3730a3" />
      <Text style={[styles.pillText, { color: '#3730a3' }]}>{label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: TransactionStatus }) {
  const tone = {
    PENDING: { bg: '#fef3c7', fg: '#92400e' },
    CANCELLED: { bg: NEUTRAL.surfaceSunken, fg: NEUTRAL.inkMid },
    FAILED: { bg: '#fee2e2', fg: '#b91c1c' },
    COMPLETED: { bg: '#dcfce7', fg: '#15803d' },
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

function EmptyState({
  search,
  type,
  status,
}: {
  search: string;
  type: TypeFilter;
  status: StatusFilter;
}) {
  let reason = 'Aucune transaction enregistrée';
  if (search.length > 0) reason = `Aucun résultat pour « ${search} »`;
  else if (status !== 'ALL') reason = `Aucune transaction ${STATUS_LABEL[status as TransactionStatus].toLowerCase()}`;
  else if (type !== 'ALL') reason = `Aucun ${type === 'DEPOSIT' ? 'dépôt' : 'retrait'} pour le moment`;

  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name="document-text-outline" size={22} color={NEUTRAL.inkSoft} />
      </View>
      <Text style={styles.emptyTitle}>{reason}</Text>
      <Text style={styles.emptyDesc}>
        Essayez de modifier votre recherche ou vos filtres.
      </Text>
    </View>
  );
}

// ──────────────── Helpers ────────────────

function groupByDate(transactions: Transaction[]) {
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = new Map<string, { title: string; data: Transaction[]; sortKey: number }>();
  for (const tx of sortedTx) {
    const d = new Date(tx.createdAt);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const key = dayStart.toISOString();

    let title: string;
    if (dayStart.getTime() === today.getTime()) title = "Aujourd'hui";
    else if (dayStart.getTime() === yesterday.getTime()) title = 'Hier';
    else
      title = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

    if (!groups.has(key)) {
      groups.set(key, { title, data: [], sortKey: dayStart.getTime() });
    }
    groups.get(key)!.data.push(tx);
  }
  return Array.from(groups.values()).sort((a, b) => b.sortKey - a.sortKey);
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 18, 17, 0.55)',
  },
  sheet: {
    backgroundColor: NEUTRAL.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },

  handleZone: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: NEUTRAL.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  headerMeta: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: NEUTRAL.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NEUTRAL.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NEUTRAL.border,
  },

  // Totals
  totalsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    marginBottom: 10,
  },
  totalCard: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    padding: 10,
  },
  totalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: NEUTRAL.inkSoft,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: NEUTRAL.ink,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  totalCount: {
    fontSize: 9,
    color: NEUTRAL.inkSoft,
    marginTop: 1,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    marginHorizontal: SPACING.lg,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: NEUTRAL.ink,
    paddingVertical: 0,
  },

  filterScroll: { flexGrow: 0 },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    height: 32,
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
  chipTextActive: { color: NEUTRAL.inkOnFill },

  chipSm: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSmActive: {
    backgroundColor: '#fff1f1',
    borderColor: COLORS.primary,
  },
  chipSmText: {
    fontSize: 11,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
  },
  chipSmTextActive: { color: COLORS.primary },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    backgroundColor: NEUTRAL.bg,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: NEUTRAL.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeaderCount: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    backgroundColor: NEUTRAL.surface,
    gap: 12,
  },
  rowPressed: { backgroundColor: NEUTRAL.surfaceAlt },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowMeta: { flex: 1, minWidth: 0 },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
    color: NEUTRAL.ink,
  },
  rowSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  rowSubDot: { color: NEUTRAL.inkSoft, fontSize: 11 },
  rowSub: { fontSize: 12, color: NEUTRAL.inkSoft },
  rowBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  collectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: NEUTRAL.surfaceSunken,
    maxWidth: 220,
  },
  collectorPillText: {
    fontSize: 9,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
    letterSpacing: 0.3,
  },
  rowAmountWrap: { alignItems: 'flex-end' },
  rowAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rowBalance: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  divider: {
    height: 1,
    backgroundColor: NEUTRAL.borderSoft,
    marginLeft: SPACING.lg + 36 + 12,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    minHeight: 200,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: NEUTRAL.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
  },
});
