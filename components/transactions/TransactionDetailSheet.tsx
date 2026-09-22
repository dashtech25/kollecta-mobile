import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTransactionDetail } from '../../hooks/useTransactions';
import {
  Transaction,
  TransactionDetail,
  TransactionStatus,
  DepositMethod,
  MomoProvider,
  DepositRequestEmbedded,
  WithdrawalRequestEmbedded,
} from '../../types/transaction.types';

interface TransactionDetailSheetProps {
  /** Transaction to display. The sheet refetches the full detail server-side. */
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
}

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  FAILED: 'Échouée',
};

const STATUS_TONE: Record<TransactionStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#fff7e6', fg: '#a16207' },
  COMPLETED: { bg: '#dcfce7', fg: '#15803d' },
  CANCELLED: { bg: NEUTRAL.surfaceSunken, fg: NEUTRAL.inkMid },
  FAILED: { bg: '#fee2e2', fg: '#b91c1c' },
};

/**
 * Full-screen detail sheet for a single transaction.
 *
 * Designed for both supervisor and collector portals — they show the same
 * fields, the only difference is what data the backend returns based on the
 * caller's role (collector sees their own; supervisor sees their branch).
 */
export function TransactionDetailSheet({
  transaction,
  visible,
  onClose,
}: TransactionDetailSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const { data: detail, isLoading, isError } = useTransactionDetail(
    visible ? transaction?.id : null,
  );

  const tx = (detail ?? transaction) as TransactionDetail | Transaction | null;

  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, backdropOpacity]);

  if (!tx) {
    // Modal still rendered to support smooth open/close transitions when the
    // parent toggles `visible` before clearing the transaction reference.
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </View>
      </Modal>
    );
  }

  const isDeposit = tx.type === 'DEPOSIT';
  const req = (tx.depositRequest ?? tx.withdrawalRequest) as
    | DepositRequestEmbedded
    | WithdrawalRequestEmbedded
    | null;
  const status = tx.status as TransactionStatus;
  const tone = STATUS_TONE[status] ?? STATUS_TONE.PENDING;

  const heroBg = isDeposit ? '#15803d' : COLORS.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.sheet,
            { maxHeight: screenHeight * 0.95, minHeight: screenHeight * 0.75 },
          ]}
        >
          <View style={styles.handleZone}>
            <View style={styles.handle} />
          </View>

          {/* Hero header */}
          <View style={[styles.hero, { backgroundColor: heroBg }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroLabelRow}>
                <Ionicons
                  name={isDeposit ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={14}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={styles.heroKicker}>
                  {isDeposit ? 'Dépôt' : 'Retrait'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.heroAmount}>
              {isDeposit ? '+' : '−'} {fmtAmount(tx.amount)}
            </Text>
            <Text style={styles.heroId} numberOfLines={1}>
              ID · {tx.id}
            </Text>
            <View style={styles.heroBadges}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: 'rgba(255,255,255,0.15)' },
                ]}
              >
                <Ionicons
                  name={statusIcon(status)}
                  size={11}
                  color="#fff"
                />
                <Text style={styles.statusPillText}>
                  {STATUS_LABEL[status]}
                </Text>
              </View>
              {req && (
                <MethodBadgeWhite
                  method={req.method}
                  provider={req.momoProvider}
                />
              )}
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Loading shim while we fetch detail */}
            {isLoading && !detail && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={NEUTRAL.ink} size="small" />
                <Text style={styles.loadingText}>Chargement des détails…</Text>
              </View>
            )}
            {isError && !detail && (
              <View style={[styles.loadingRow, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="alert-circle" size={14} color="#b91c1c" />
                <Text style={[styles.loadingText, { color: '#b91c1c' }]}>
                  Détails indisponibles — affichage limité.
                </Text>
              </View>
            )}

            {/* Parties */}
            <View style={styles.partyRow}>
              <PartyCard
                label="Client"
                name={
                  tx.client
                    ? `${tx.client.firstName} ${tx.client.lastName}`
                    : '—'
                }
                sub={tx.client?.phone ?? null}
                extra={
                  tx.client && (
                    <>
                      {tx.client.balance !== undefined && (
                        <KvLine
                          label="Solde actuel"
                          value={fmtAmount(tx.client.balance)}
                        />
                      )}
                      {tx.client.zone && (
                        <KvLine label="Zone" value={tx.client.zone.name} />
                      )}
                    </>
                  )
                }
              />
              <PartyCard
                label="Collecteur"
                name={
                  tx.collector
                    ? `${tx.collector.firstName} ${tx.collector.lastName}`
                    : '—'
                }
                sub={tx.collector?.phone ?? null}
                extra={
                  tx.collector?.branch && (
                    <KvLine
                      label="Branche"
                      value={`${tx.collector.branch.name} · ${tx.collector.branch.city}`}
                    />
                  )
                }
              />
            </View>

            {/* Workflow */}
            {req && <WorkflowSection req={req} type={tx.type} />}

            {/* Geolocation */}
            {(tx.latitude && tx.longitude) ||
            ('geolocationLogs' in tx &&
              tx.geolocationLogs &&
              tx.geolocationLogs.length > 0) ? (
              <Section title="Géolocalisation" icon="location">
                {tx.latitude !== null && tx.longitude !== null && (
                  <TouchableOpacity
                    onPress={() => openMap(tx.latitude!, tx.longitude!)}
                    style={styles.mapBtn}
                    activeOpacity={0.8}
                  >
                    <View>
                      <Text style={styles.mapBtnLabel}>
                        Position au scellement
                      </Text>
                      <Text style={styles.mapBtnCoords}>
                        {tx.latitude.toFixed(5)},{' '}
                        {tx.longitude.toFixed(5)}
                      </Text>
                    </View>
                    <View style={styles.mapBtnIcon}>
                      <Ionicons name="map" size={14} color={COLORS.primary} />
                    </View>
                  </TouchableOpacity>
                )}
                {'geolocationLogs' in tx &&
                  tx.geolocationLogs &&
                  tx.geolocationLogs.length > 0 && (
                    <View style={styles.geoLogsBox}>
                      <Text style={styles.geoLogsTitle}>
                        Mouvements (±5 min)
                      </Text>
                      {tx.geolocationLogs.map((g) => (
                        <View key={g.id} style={styles.geoLogRow}>
                          <Text style={styles.geoLogAction}>{g.action}</Text>
                          <Text style={styles.geoLogCoords}>
                            {g.latitude.toFixed(4)},{' '}
                            {g.longitude.toFixed(4)}
                          </Text>
                          <Text style={styles.geoLogTime}>
                            {fmtTime(g.createdAt)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
              </Section>
            ) : null}

            {/* Note */}
            {(() => {
              const reqNote =
                req && 'note' in req ? (req.note as string | null) : null;
              const noteText = tx.note ?? reqNote;
              if (!noteText) return null;
              return (
                <Section title="Note du collecteur" icon="document-text">
                  <Text style={styles.noteText}>{noteText}</Text>
                </Section>
              );
            })()}

            {/* Receipt */}
            {req && 'receiptUrl' in req && req.receiptUrl && (
              <Section title="Reçu" icon="receipt">
                <TouchableOpacity
                  onPress={() => Linking.openURL(req.receiptUrl!)}
                  style={styles.receiptBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="download" size={14} color="#fff" />
                  <Text style={styles.receiptBtnText}>
                    Télécharger le reçu PDF
                  </Text>
                </TouchableOpacity>
                {req.receiptSentAt && (
                  <Text style={styles.receiptHint}>
                    Envoyé au client le {fmtDate(req.receiptSentAt)}
                  </Text>
                )}
              </Section>
            )}

            {/* Bare meta */}
            <Section title="Métadonnées" icon="information-circle">
              <KvLine label="Créée le" value={fmtDate(tx.createdAt)} />
              {tx.updatedAt && (
                <KvLine label="Mise à jour" value={fmtDate(tx.updatedAt)} />
              )}
              <KvLine label="Type" value={isDeposit ? 'Dépôt' : 'Retrait'} />
              <KvLine label="Statut" value={STATUS_LABEL[status]} />
            </Section>

            <View style={{ height: SPACING.xl }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ──────────────── Sub-components ────────────────

function statusIcon(status: TransactionStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'COMPLETED':
      return 'checkmark-circle';
    case 'PENDING':
      return 'time';
    case 'FAILED':
      return 'alert-circle';
    case 'CANCELLED':
      return 'close-circle';
    default:
      return 'ellipse';
  }
}

function MethodBadgeWhite({
  method,
  provider,
}: {
  method: DepositMethod | null;
  provider: MomoProvider | null;
}) {
  if (!method) return null;
  const label =
    method === 'CASH'
      ? 'Espèces'
      : provider === 'ORANGE_MONEY'
        ? 'Orange Money'
        : provider === 'MTN_MONEY'
          ? 'MTN MoMo'
          : 'Mobile Money';
  const icon: keyof typeof Ionicons.glyphMap =
    method === 'CASH' ? 'cash' : 'phone-portrait';
  return (
    <View
      style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
    >
      <Ionicons name={icon} size={11} color="#fff" />
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function PartyCard({
  label,
  name,
  sub,
  extra,
}: {
  label: string;
  name: string;
  sub: string | null;
  extra?: React.ReactNode;
}) {
  return (
    <View style={styles.partyCard}>
      <Text style={styles.partyLabel}>{label}</Text>
      <Text style={styles.partyName} numberOfLines={1}>
        {name}
      </Text>
      {sub && (
        <Text style={styles.partySub} numberOfLines={1}>
          {sub}
        </Text>
      )}
      {extra}
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={12} color={NEUTRAL.inkSoft} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function KvLine({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | React.ReactNode;
  valueColor?: string;
}) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text
        style={[styles.kvValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function WorkflowSection({
  req,
  type,
}: {
  req: DepositRequestEmbedded | WithdrawalRequestEmbedded;
  type: 'DEPOSIT' | 'WITHDRAWAL';
}) {
  const otpVerified =
    'otpVerified' in req
      ? req.otpVerified
      : 'smsCodeVerified' in req
        ? req.smsCodeVerified
        : false;
  const sentToClient = 'sentToClient' in req ? req.sentToClient : null;
  const sentToClientAt =
    'sentToClientAt' in req ? req.sentToClientAt : null;

  return (
    <Section
      title={type === 'DEPOSIT' ? 'Workflow de dépôt' : 'Workflow de retrait'}
      icon="git-branch"
    >
      <KvLine
        label="Méthode"
        value={req.method === 'CASH' ? 'Espèces' : 'Mobile Money'}
      />
      {req.momoProvider && (
        <KvLine
          label="Opérateur MoMo"
          value={
            req.momoProvider === 'ORANGE_MONEY' ? 'Orange Money' : 'MTN MoMo'
          }
        />
      )}
      {req.momoNumber && (
        <KvLine label="Numéro MoMo" value={req.momoNumber} />
      )}
      <KvLine
        label={type === 'DEPOSIT' ? 'OTP vérifié' : 'Code SMS vérifié'}
        value={otpVerified ? 'Oui' : 'Non'}
        valueColor={otpVerified ? '#15803d' : NEUTRAL.inkSoft}
      />
      {'otpChannel' in req && req.otpChannel && (
        <KvLine label="Canal OTP" value={req.otpChannel} />
      )}
      {sentToClient !== null && (
        <KvLine
          label="Envoi vers client"
          value={
            sentToClient
              ? `Oui${sentToClientAt ? ` · ${fmtDate(sentToClientAt)}` : ''}`
              : 'Remis en main propre'
          }
          valueColor={sentToClient ? '#15803d' : NEUTRAL.inkMid}
        />
      )}
      <View style={styles.kvDivider} />
      <KvLine label="Initié" value={fmtDate(req.initiatedAt)} />
      {'fundsSentAt' in req && req.fundsSentAt && (
        <KvLine label="Fonds envoyés" value={fmtDate(req.fundsSentAt)} />
      )}
      {req.completedAt && (
        <KvLine
          label="Terminé"
          value={fmtDate(req.completedAt)}
          valueColor="#15803d"
        />
      )}
      {req.rejectedAt && (
        <KvLine
          label="Rejeté"
          value={`${fmtDate(req.rejectedAt)}${req.rejectionReason ? ` — ${req.rejectionReason}` : ''}`}
          valueColor="#b91c1c"
        />
      )}
    </Section>
  );
}

// ──────────────── Helpers ────────────────

function openMap(lat: number, lng: number) {
  // Use a simple OSM URL — opens in browser or installed maps app via the
  // OS link handler. Avoiding `geo:` prevents the iOS-only "no apps for this"
  // dialog when Maps isn't installed (rare but possible on dev devices).
  const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  Linking.openURL(url).catch(() => {
    // ignore — user may not have a browser; UI already shows the coords above
  });
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,18,17,0.55)',
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
  handleZone: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: NEUTRAL.border,
  },

  // Hero
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 14,
    paddingBottom: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroKicker: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
  heroId: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Body
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  loadingText: { fontSize: 12, color: NEUTRAL.inkMid },

  // Parties
  partyRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  partyCard: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    padding: 12,
  },
  partyLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: NEUTRAL.inkSoft,
    marginBottom: 6,
  },
  partyName: { fontSize: 14, fontWeight: '700', color: NEUTRAL.ink },
  partySub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },

  // Sections
  section: { marginBottom: SPACING.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: NEUTRAL.inkMid,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    padding: 10,
  },

  // KV rows
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    gap: 12,
  },
  kvLabel: { fontSize: 12, color: NEUTRAL.inkSoft, flexShrink: 0 },
  kvValue: {
    fontSize: 12,
    fontWeight: '600',
    color: NEUTRAL.ink,
    flex: 1,
    textAlign: 'right',
  },
  kvDivider: {
    height: 1,
    backgroundColor: NEUTRAL.borderSoft,
    marginVertical: 6,
  },

  // Map button
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  mapBtnLabel: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  mapBtnCoords: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  mapBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Geo logs
  geoLogsBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: BORDER_RADIUS.md,
  },
  geoLogsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: NEUTRAL.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  geoLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 8,
  },
  geoLogAction: {
    fontSize: 11,
    fontWeight: '700',
    color: NEUTRAL.ink,
    flex: 1,
  },
  geoLogCoords: {
    fontSize: 11,
    color: NEUTRAL.inkMid,
    fontVariant: ['tabular-nums'],
  },
  geoLogTime: { fontSize: 11, color: NEUTRAL.inkSoft, width: 70, textAlign: 'right' },

  // Note
  noteText: {
    fontSize: 13,
    color: NEUTRAL.ink,
    lineHeight: 19,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  // Receipt
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  receiptBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  receiptHint: {
    marginTop: 8,
    fontSize: 11,
    color: NEUTRAL.inkSoft,
  },
});
