import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useClient } from '../../../../hooks/useClients';
import { useTransactions } from '../../../../hooks/useTransactions';
import { TransactionsSheet } from '../../../../components/transactions/TransactionsSheet';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { Transaction } from '../../../../types/transaction.types';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: client,
    isLoading: clientLoading,
    refetch: refetchClient,
    isFetching,
  } = useClient(id);
  const {
    data: txData,
    isLoading: txLoading,
    refetch: refetchTx,
  } = useTransactions({ clientId: id, limit: 20 });

  const [sheetOpen, setSheetOpen] = useState(false);

  // Defensive coercion — Prisma Decimal columns can serialize as strings.
  // Always work with real Numbers so arithmetic never falls back to string
  // concatenation.
  const transactions = useMemo(
    () =>
      (txData?.transactions ?? []).map((tx) => ({
        ...tx,
        amount: Number(tx.amount) || 0,
      })),
    [txData?.transactions],
  );

  // Lifetime totals come from the server (`GET /clients/:id` returns `stats`).
  // If a stale cache or older backend response is missing them, we fall back
  // to summing the latest page so the UI never shows 0 just because the
  // payload is incomplete.
  const stats = useMemo(() => {
    if (client?.stats) {
      return {
        totalIn: Number(client.stats.totalDeposited) || 0,
        totalOut: Number(client.stats.totalWithdrawn) || 0,
        depositCount: client.stats.depositCount,
        lastActivity: client.stats.lastTransactionAt,
      };
    }
    let totalIn = 0;
    let totalOut = 0;
    let depositCount = 0;
    let lastActivity: string | null = null;
    transactions.forEach((tx) => {
      if (tx.status !== 'COMPLETED') return;
      if (tx.type === 'DEPOSIT') {
        totalIn += tx.amount;
        depositCount++;
      } else {
        totalOut += tx.amount;
      }
      if (!lastActivity || new Date(tx.createdAt) > new Date(lastActivity)) {
        lastActivity = tx.createdAt;
      }
    });
    return { totalIn, totalOut, depositCount, lastActivity };
  }, [client?.stats, transactions]);

  if (clientLoading || !client) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={NEUTRAL.ink} />
        </View>
      </SafeAreaView>
    );
  }

  const initials = `${client.firstName[0] ?? ''}${client.lastName[0] ?? ''}`.toUpperCase();
  const memberSince = new Date(client.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const handleDeposit = () => {
    router.push({
      pathname: '/(collector)/(tabs)/deposits/initiate',
      params: { clientId: client.id },
    });
  };

  const handleWithdraw = () => {
    router.push({
      pathname: '/(collector)/(tabs)/withdrawals/initiate',
      params: { clientId: client.id },
    });
  };

  /**
   * Pre-fill a withdrawal with the chosen MoMo channel + number for this client.
   * Hands off to the existing initiate flow with extra params; the form will
   * lock the channel selection and number when these are present.
   */
  const handleWithdrawWithChannel = (
    provider: 'ORANGE_MONEY' | 'MTN_MONEY',
    number: string,
  ) => {
    router.push({
      pathname: '/(collector)/(tabs)/withdrawals/initiate',
      params: {
        clientId: client.id,
        momoProvider: provider,
        momoNumber: number,
      },
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${client.phone}`).catch(() => {});
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          onBack={() => router.back()}
          title={`${client.firstName} ${client.lastName}`}
          onCall={handleCall}
          onEdit={() =>
            router.push(`/(collector)/(tabs)/clients/edit/${client.id}`)
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => {
                refetchClient();
                refetchTx();
              }}
              tintColor={NEUTRAL.ink}
            />
          }
        >
          {/* ── Hero balance card ── */}
          <View style={styles.heroCard}>
            <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
            <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />

            <View style={styles.heroTop}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {client.firstName} {client.lastName}
                </Text>
                <Text style={styles.heroPhone}>{client.phone}</Text>
              </View>
              {!client.isActive && (
                <View style={styles.heroStatusPill}>
                  <Text style={styles.heroStatusText}>Inactif</Text>
                </View>
              )}
            </View>

            <View style={styles.heroDivider} />

            <Text style={styles.heroBalanceLabel}>Solde actuel</Text>
            <Text style={styles.heroBalance}>{fmtAmount(Number(client.balance) || 0)}</Text>

            <View style={styles.heroFooter}>
              <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.65)" />
              <Text style={styles.heroFooterText}>Client depuis {memberSince}</Text>
              {stats.lastActivity && (
                <>
                  <View style={styles.heroFooterDot} />
                  <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.heroFooterText}>
                    Dernier mouvement {formatRelativeDate(stats.lastActivity)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* ── Action buttons ── */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleDeposit}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Effectuer un dépôt pour ce client"
            >
              <Ionicons name="arrow-down-circle" size={20} color={COLORS.white} />
              <Text style={styles.actionBtnPrimaryText}>Dépôt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={handleWithdraw}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Initier un retrait pour ce client"
            >
              <Ionicons name="arrow-up-circle" size={20} color={COLORS.primary} />
              <Text style={styles.actionBtnSecondaryText}>Retrait</Text>
            </TouchableOpacity>
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatPill
              label="Total déposé"
              value={fmtCompact(stats.totalIn) + ' FCFA'}
              icon="arrow-down"
            />
            <StatPill
              label="Total retiré"
              value={fmtCompact(stats.totalOut) + ' FCFA'}
              icon="arrow-up"
            />
            <StatPill
              label="Dépôts"
              value={String(stats.depositCount)}
              icon="layers-outline"
            />
          </View>

          {/* ── Info card ── */}
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoCard}>
            <DecorBg variant="dots" anchor="top-right" color={COLORS.primary} opacity={0.08} width={70} height={60} />

            <InfoRow
              icon="call-outline"
              label="Téléphone"
              value={client.phone}
              actionIcon="open-outline"
              onAction={handleCall}
            />

            {/* MoMo — both numbers shown when present, with a per-channel
                withdrawal shortcut. "Non renseigné" if neither is set. */}
            {client.orangeMoneyNumber || client.mtnMoneyNumber ? (
              <>
                {client.orangeMoneyNumber ? (
                  <>
                    <InfoSep />
                    <InfoRow
                      icon="wallet-outline"
                      label="Orange Money"
                      value={client.orangeMoneyNumber}
                      actionIcon="arrow-up-circle-outline"
                      actionLabel="Initier un retrait via Orange Money"
                      onAction={() =>
                        handleWithdrawWithChannel(
                          'ORANGE_MONEY',
                          client.orangeMoneyNumber!,
                        )
                      }
                    />
                  </>
                ) : null}
                {client.mtnMoneyNumber ? (
                  <>
                    <InfoSep />
                    <InfoRow
                      icon="wallet-outline"
                      label="MTN Mobile Money"
                      value={client.mtnMoneyNumber}
                      actionIcon="arrow-up-circle-outline"
                      actionLabel="Initier un retrait via MTN Mobile Money"
                      onAction={() =>
                        handleWithdrawWithChannel(
                          'MTN_MONEY',
                          client.mtnMoneyNumber!,
                        )
                      }
                    />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <InfoSep />
                <InfoRow
                  icon="wallet-outline"
                  label="Mobile Money"
                  value="Non renseigné"
                />
              </>
            )}

            <InfoSep />
            <InfoRow
              icon="location-outline"
              label="Zone"
              value={client.zone?.name ?? 'Non assignée'}
            />
            {client.address && (
              <>
                <InfoSep />
                <InfoRow icon="map-outline" label="Adresse" value={client.address} />
              </>
            )}
            {client.idCardNumber && (
              <>
                <InfoSep />
                <InfoRow icon="card-outline" label="N° pièce d'identité" value={client.idCardNumber} />
              </>
            )}
          </View>

          {/* ── KYC photo ── */}
          {client.idCardPhoto && (
            <>
              <Text style={styles.sectionTitle}>Pièce d'identité</Text>
              <View style={styles.kycCard}>
                <Image
                  source={{ uri: client.idCardPhoto }}
                  style={styles.kycImage}
                  accessibilityLabel="Photo de la pièce d'identité du client"
                />
                <View style={styles.kycCaption}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={NEUTRAL.inkMid} />
                  <Text style={styles.kycCaptionText}>
                    Document conservé pour vérification KYC
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* ── Transactions list ── */}
          <View style={styles.txSectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {transactions.length > 0 && (
              <TouchableOpacity
                onPress={() => setSheetOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Voir toutes les transactions de ce client"
              >
                <View style={styles.viewAllPill}>
                  <Text style={styles.viewAllText}>Voir tout</Text>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.txCard}>
            {txLoading ? (
              <View style={styles.txLoading}>
                <ActivityIndicator color={NEUTRAL.ink} />
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyTxState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="document-text-outline" size={20} color={NEUTRAL.inkSoft} />
                </View>
                <Text style={styles.emptyTitle}>Aucune transaction</Text>
                <Text style={styles.emptyDesc}>
                  Effectuez un premier dépôt pour démarrer l'historique de ce client.
                </Text>
              </View>
            ) : (
              transactions.slice(0, 6).map((tx, idx) => (
                <TxRow key={tx.id} tx={tx} isFirst={idx === 0} />
              ))
            )}
          </View>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </SafeAreaView>

      {/* All transactions filtered to this client */}
      <TransactionsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        clientId={client.id}
      />
    </>
  );
}

// ──────────────── Sub-components ────────────────

function Header({
  onBack,
  title,
  onCall,
  onEdit,
}: {
  onBack: () => void;
  title?: string;
  onCall?: () => void;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color={NEUTRAL.ink} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title ?? 'Client'}
      </Text>
      <View style={styles.headerActions}>
        {onCall ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onCall}
            accessibilityRole="button"
            accessibilityLabel="Appeler le client"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call-outline" size={18} color={NEUTRAL.ink} />
          </TouchableOpacity>
        ) : null}
        {onEdit ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Modifier le client"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={18} color={NEUTRAL.ink} />
          </TouchableOpacity>
        ) : null}
        {!onCall && !onEdit && <View style={{ width: 40 }} />}
      </View>
    </View>
  );
}

function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statPill}>
      <View style={styles.statPillIcon}>
        <Ionicons name={icon} size={13} color={NEUTRAL.ink} />
      </View>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  actionIcon,
  onAction,
  actionLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}>
        <Ionicons name={icon} size={15} color={NEUTRAL.inkMid} />
      </View>
      <View style={styles.infoRowMeta}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {actionIcon && onAction && (
        <TouchableOpacity
          style={styles.infoRowAction}
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? label}
        >
          <Ionicons name={actionIcon} size={15} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoSep() {
  return <View style={styles.infoSep} />;
}

function TxRow({ tx, isFirst }: { tx: Transaction; isFirst: boolean }) {
  const isDeposit = tx.type === 'DEPOSIT';
  const time = new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = new Date(tx.createdAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dStart = new Date(date);
  dStart.setHours(0, 0, 0, 0);

  const dateLabel =
    dStart.getTime() === today.getTime()
      ? `Aujourd'hui · ${time}`
      : dStart.getTime() === yesterday.getTime()
      ? `Hier · ${time}`
      : date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        }) + ` · ${time}`;

  return (
    <View style={[styles.txRow, !isFirst && styles.txRowDivider]}>
      <View style={styles.txIcon}>
        <Ionicons
          name={isDeposit ? 'arrow-down' : 'arrow-up'}
          size={14}
          color={NEUTRAL.ink}
        />
      </View>
      <View style={styles.txMeta}>
        <Text style={styles.txTitle}>
          {isDeposit ? 'Dépôt' : 'Retrait'}
          {tx.status !== 'COMPLETED' ? ` · ${statusLabel(tx.status)}` : ''}
        </Text>
        <Text style={styles.txDate}>{dateLabel}</Text>
      </View>
      <Text style={styles.txAmount}>
        {isDeposit ? '+' : '−'} {fmtAmount(tx.amount)}
      </Text>
    </View>
  );
}

// ──────────────── Helpers ────────────────

function statusLabel(s: string) {
  switch (s) {
    case 'PENDING':
      return 'En attente';
    case 'CANCELLED':
      return 'Annulé';
    case 'FAILED':
      return 'Échoué';
    default:
      return s;
  }
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `il y a ${hours}h`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'hier';
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEUTRAL.bg },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: NEUTRAL.ink,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroAvatarText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroName: {
    color: NEUTRAL.inkOnFill,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroPhone: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  heroStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroStatusText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  heroBalanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroBalance: {
    color: NEUTRAL.inkOnFill,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  heroFooterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  heroFooterDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnPrimaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionBtnSecondary: {
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtnSecondaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  statPill: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    alignItems: 'flex-start',
  },
  statPillIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statPillLabel: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statPillValue: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  txSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Info card
  infoCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  infoRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowMeta: { flex: 1, minWidth: 0 },
  infoRowLabel: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoRowValue: {
    fontSize: 13,
    color: NEUTRAL.ink,
    fontWeight: '600',
  },
  infoRowAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#fde0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSep: {
    height: 1,
    backgroundColor: NEUTRAL.borderSoft,
    marginLeft: SPACING.md + 32 + 12,
  },

  // KYC photo card
  kycCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  kycImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: NEUTRAL.surfaceSunken,
    resizeMode: 'cover',
  },
  kycCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  kycCaptionText: {
    fontSize: 11,
    color: NEUTRAL.inkMid,
    fontWeight: '500',
    flex: 1,
  },

  // Transactions card
  txCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  txLoading: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  txRowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMeta: { flex: 1, minWidth: 0 },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: NEUTRAL.ink,
  },
  txDate: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },

  // Empty
  emptyTxState: {
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
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
