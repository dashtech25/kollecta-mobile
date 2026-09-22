import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useClients } from '../../../../hooks/useClients';
import { useInitiateWithdrawal } from '../../../../hooks/useWithdrawals';
import { useGeolocation } from '../../../../hooks/useGeolocation';
import { DecorBg } from '../../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { Client, MomoProvider } from '../../../../types/client.types';
import { WithdrawalMethod } from '../../../../types/withdrawal.types';

const QUICK_PCT = [0.25, 0.5, 0.75, 1];

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

export default function InitiateWithdrawalScreen() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const initiate = useInitiateWithdrawal();
  const location = useGeolocation();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState('');
  // Mobile Money is the default mode — collectors can switch to CASH (espèces)
  // when they're handing the cash over directly.
  const [method, setMethod] = useState<WithdrawalMethod>('MOMO');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<MomoProvider>('ORANGE_MONEY');
  const [search, setSearch] = useState('');

  const numericAmount = parseInt(amount) || 0;
  const balance = selectedClient?.balance ?? 0;
  const balanceAfter = Math.max(balance - numericAmount, 0);
  const balanceRatio = balance > 0 ? balanceAfter / balance : 0;
  const insufficient = numericAmount > balance;

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const pickClient = (c: Client) => {
    setSelectedClient(c);
    setSearch('');
    // Pre-fill momo number based on default provider
    if (c.orangeMoneyNumber) {
      setMomoNumber(c.orangeMoneyNumber);
      setMomoProvider('ORANGE_MONEY');
    } else if (c.mtnMoneyNumber) {
      setMomoNumber(c.mtnMoneyNumber);
      setMomoProvider('MTN_MONEY');
    } else {
      setMomoNumber('');
    }
  };

  const switchProvider = (p: MomoProvider) => {
    setMomoProvider(p);
    if (selectedClient) {
      const num =
        p === 'ORANGE_MONEY'
          ? selectedClient.orangeMoneyNumber
          : selectedClient.mtnMoneyNumber;
      if (num) setMomoNumber(num);
    }
  };

  const handleInitiate = async () => {
    if (!selectedClient) return Alert.alert('Erreur', 'Sélectionnez un client');
    if (!numericAmount || numericAmount < 1)
      return Alert.alert('Erreur', 'Montant invalide');
    if (insufficient) return Alert.alert('Erreur', 'Solde insuffisant');
    if (method === 'MOMO' && !momoNumber.trim()) {
      return Alert.alert('Erreur', 'Numéro MoMo requis pour ce mode');
    }

    try {
      const created = await initiate.mutateAsync({
        clientId: selectedClient.id,
        amount: numericAmount,
        method,
        momoProvider: method === 'MOMO' ? momoProvider : undefined,
        momoNumber: method === 'MOMO' ? momoNumber.trim() : undefined,
        latitude: location.latitude ?? undefined,
        longitude: location.longitude ?? undefined,
      });
      Alert.alert(
        'Code envoyé au client',
        `Un code à 6 chiffres a été envoyé à ${selectedClient.firstName} par SMS. ` +
          'Demandez-lui le code pour valider le retrait.',
        [
          {
            text: 'Continuer',
            onPress: () =>
              router.replace(
                `/(collector)/(tabs)/withdrawals/verify/${created.id}`,
              ),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Échec de la demande');
    }
  };

  const canSubmit =
    !!selectedClient &&
    numericAmount > 0 &&
    !insufficient &&
    (method === 'CASH' || momoNumber.trim().length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={20} color={NEUTRAL.ink} />
          </TouchableOpacity>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Décaissement</Text>
            <Text style={styles.topBarTitle}>Nouveau retrait</Text>
          </View>
          <View
            style={[
              styles.geoChip,
              { backgroundColor: location.latitude ? '#E8F5E9' : NEUTRAL.surfaceSunken },
            ]}
          >
            <Ionicons
              name={location.latitude ? 'location' : 'location-outline'}
              size={12}
              color={location.latitude ? '#2E7D32' : NEUTRAL.inkSoft}
            />
            <Text
              style={[
                styles.geoChipText,
                { color: location.latitude ? '#2E7D32' : NEUTRAL.inkSoft },
              ]}
            >
              {location.latitude ? 'GPS' : '—'}
            </Text>
          </View>
        </View>

        {!selectedClient ? (
          <>
            {/* ── Hero (no client) ── */}
            <View style={styles.heroCard}>
              <DecorBg
                variant="rings"
                anchor="bottom-right"
                color="#FFFFFF"
                opacity={0.1}
                width={220}
                height={220}
              />
              <DecorBg
                variant="dots"
                anchor="top-left"
                color="#FFFFFF"
                opacity={0.06}
                width={120}
                height={80}
              />
              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>Étape 1 sur 2</Text>
                <Text style={styles.heroAmount}>Choisir le client</Text>
                <Text style={styles.heroSub}>
                  Sélectionnez le bénéficiaire du retrait pour démarrer.
                </Text>
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="people" size={48} color="rgba(255,255,255,0.9)" />
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={NEUTRAL.inkSoft} />
              <TextInput
                placeholder="Nom, prénom ou téléphone…"
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

            {loadingClients ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : filteredClients.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={20} color={NEUTRAL.inkSoft} />
                </View>
                <Text style={styles.emptyTitle}>Aucun client trouvé</Text>
                <Text style={styles.emptyDesc}>
                  Essayez un autre mot-clé.
                </Text>
              </View>
            ) : (
              <View style={styles.clientList}>
                {filteredClients.map((c, idx) => {
                  const hasMoMo = !!(c.orangeMoneyNumber || c.mtnMoneyNumber);
                  const disabled = c.balance <= 0;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={disabled ? 1 : 0.78}
                      onPress={() => !disabled && pickClient(c)}
                      style={[
                        styles.clientRow,
                        idx > 0 && styles.clientRowDivider,
                        disabled && styles.clientRowDisabled,
                      ]}
                    >
                      <View style={styles.clientAvatar}>
                        <Text style={styles.clientAvatarText}>
                          {(c.firstName[0] ?? '') + (c.lastName[0] ?? '')}
                        </Text>
                      </View>
                      <View style={styles.clientMeta}>
                        <Text style={styles.clientName} numberOfLines={1}>
                          {c.firstName} {c.lastName}
                        </Text>
                        <View style={styles.clientTags}>
                          {c.orangeMoneyNumber && (
                            <View style={[styles.providerTag, { backgroundColor: '#FFF3E0' }]}>
                              <Text style={[styles.providerTagText, { color: '#E65100' }]}>
                                Orange
                              </Text>
                            </View>
                          )}
                          {c.mtnMoneyNumber && (
                            <View style={[styles.providerTag, { backgroundColor: '#FFFDE7' }]}>
                              <Text style={[styles.providerTagText, { color: '#F57F17' }]}>
                                MTN
                              </Text>
                            </View>
                          )}
                          {!hasMoMo && (
                            <Text style={styles.clientPhone}>{c.phone}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.clientBalanceWrap}>
                        <Text
                          style={[
                            styles.clientBalance,
                            disabled && { color: NEUTRAL.inkSoft },
                          ]}
                        >
                          {fmtCompact(c.balance)}
                        </Text>
                        <Text style={styles.clientBalanceUnit}>FCFA</Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={NEUTRAL.inkSoft}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <>
            {/* ── Selected client hero ── */}
            <View style={styles.heroCard}>
              <DecorBg
                variant="rings"
                anchor="bottom-right"
                color="#FFFFFF"
                opacity={0.1}
                width={220}
                height={220}
              />
              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>Bénéficiaire</Text>
                <Text style={styles.heroAmount} numberOfLines={1}>
                  {selectedClient.firstName} {selectedClient.lastName}
                </Text>
                <Text style={styles.heroSub}>
                  Solde disponible · {fmtAmount(balance)}
                </Text>
                <View style={styles.heroDivider} />
                <Text style={styles.heroFooterText}>
                  Après retrait : {fmtAmount(balanceAfter)}
                </Text>
              </View>
              <View style={styles.heroArcWrap}>
                <ProgressArc
                  ratio={balanceRatio}
                  size={104}
                  strokeWidth={8}
                  trackColor="rgba(255,255,255,0.15)"
                  progressColor={NEUTRAL.inkOnFill}
                />
                <View style={styles.heroArcCenter} pointerEvents="none">
                  <Text style={styles.heroArcPct}>
                    {Math.round(balanceRatio * 100)}%
                  </Text>
                  <Text style={styles.heroArcLabel}>restant</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setSelectedClient(null);
                setAmount('');
                setMomoNumber('');
              }}
              style={styles.changeRow}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={14} color={COLORS.primary} />
              <Text style={styles.changeRowText}>Changer de client</Text>
            </TouchableOpacity>

            {/* ── Amount ── */}
            <Text style={styles.sectionTitle}>Montant à retirer</Text>
            <View
              style={[
                styles.amountCard,
                insufficient && { borderColor: COLORS.error },
              ]}
            >
              <Text style={styles.amountCurrency}>FCFA</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={NEUTRAL.inkSoft}
                maxLength={9}
              />
              {amount.length > 0 && (
                <TouchableOpacity onPress={() => setAmount('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={NEUTRAL.inkSoft} />
                </TouchableOpacity>
              )}
            </View>
            {insufficient && (
              <View style={styles.warnRow}>
                <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                <Text style={styles.warnText}>
                  Le montant dépasse le solde de {fmtAmount(balance)}.
                </Text>
              </View>
            )}

            {/* Quick percent */}
            <View style={styles.quickRow}>
              {QUICK_PCT.map((pct) => {
                const v = Math.round(balance * pct);
                const active = numericAmount === v && v > 0;
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.quickPill, active && styles.quickPillActive]}
                    onPress={() => setAmount(String(v))}
                    activeOpacity={0.78}
                  >
                    <Text
                      style={[
                        styles.quickPillText,
                        active && styles.quickPillTextActive,
                      ]}
                    >
                      {pct === 1 ? 'Tout' : `${pct * 100}%`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Mode de retrait — MOMO par défaut ── */}
            <Text style={styles.sectionTitle}>Mode de retrait</Text>
            <View style={styles.methodRow}>
              <MethodCard
                active={method === 'MOMO'}
                onPress={() => setMethod('MOMO')}
                icon="phone-portrait"
                iconColor="#E65100"
                bg="#FFF3E0"
                label="Mobile Money"
                sub="Orange / MTN"
              />
              <MethodCard
                active={method === 'CASH'}
                onPress={() => setMethod('CASH')}
                icon="cash"
                iconColor="#2E7D32"
                bg="#E8F5E9"
                label="Espèces"
                sub="Remise en main propre"
              />
            </View>

            {/* ── Provider (only for MOMO) ── */}
            {method === 'MOMO' && (
            <>
            <Text style={styles.sectionTitle}>Opérateur Mobile Money</Text>
            <View style={styles.providerRow}>
              {(['ORANGE_MONEY', 'MTN_MONEY'] as MomoProvider[]).map((p) => {
                const active = momoProvider === p;
                const isOrange = p === 'ORANGE_MONEY';
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => switchProvider(p)}
                    activeOpacity={0.85}
                    style={[
                      styles.providerCard,
                      active && {
                        borderColor: isOrange ? '#E65100' : '#F57F17',
                        backgroundColor: isOrange ? '#FFF3E0' : '#FFFDE7',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.providerIcon,
                        {
                          backgroundColor: isOrange ? '#E65100' : '#F57F17',
                        },
                      ]}
                    >
                      <Ionicons
                        name="phone-portrait"
                        size={14}
                        color="#fff"
                      />
                    </View>
                    <Text
                      style={[
                        styles.providerLabel,
                        active && { color: NEUTRAL.ink, fontWeight: '700' },
                      ]}
                    >
                      {isOrange ? 'Orange Money' : 'MTN MoMo'}
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={isOrange ? '#E65100' : '#F57F17'}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── MoMo number ── */}
            <Text style={styles.sectionTitle}>Numéro Mobile Money</Text>
            <View style={styles.numberWrap}>
              <Ionicons name="call-outline" size={16} color={NEUTRAL.inkSoft} />
              <TextInput
                style={styles.numberInput}
                value={momoNumber}
                onChangeText={setMomoNumber}
                keyboardType="phone-pad"
                placeholder="+237…"
                placeholderTextColor={NEUTRAL.inkSoft}
              />
            </View>
            </>
            )}

            {/* ── CASH-only reminder banner ── */}
            {method === 'CASH' && (
              <View style={styles.cashBanner}>
                <View style={styles.cashBannerIcon}>
                  <Ionicons name="cash" size={14} color="#2E7D32" />
                </View>
                <Text style={styles.cashBannerText}>
                  Vous remettrez les fonds en espèces. Aucun transfert Mobile
                  Money ne sera effectué.
                </Text>
              </View>
            )}

            {/* ── Submit ── */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!canSubmit || initiate.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={handleInitiate}
              disabled={!canSubmit || initiate.isPending}
              activeOpacity={0.85}
            >
              {initiate.isPending ? (
                <ActivityIndicator color={NEUTRAL.inkOnFill} />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane"
                    size={16}
                    color={NEUTRAL.inkOnFill}
                  />
                  <Text style={styles.submitBtnText}>
                    Initier {numericAmount > 0 ? fmtAmount(numericAmount) : 'le retrait'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Le client recevra un code à 6 chiffres par SMS.
              Vous l'utiliserez pour valider le retrait.
            </Text>
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function MethodCard({
  active,
  onPress,
  icon,
  iconColor,
  bg,
  label,
  sub,
}: {
  active: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bg: string;
  label: string;
  sub: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.methodCard,
        active && { borderColor: iconColor, backgroundColor: bg },
      ]}
    >
      <View style={[styles.methodIcon, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.methodLabel, active && { fontWeight: '700' }]}>
          {label}
        </Text>
        <Text style={styles.methodSub}>{sub}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={18} color={iconColor} />}
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
  geoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  geoChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

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
  heroAmount: {
    color: NEUTRAL.inkOnFill,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 6,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10,
  },
  heroFooterText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  heroIconWrap: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: NEUTRAL.ink,
    padding: 0,
  },

  // Client list
  clientList: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  clientRowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  clientRowDisabled: { opacity: 0.5 },
  clientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde0e0',
  },
  clientAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  clientMeta: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '600', color: NEUTRAL.ink },
  clientTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  clientPhone: { fontSize: 11, color: NEUTRAL.inkSoft },
  providerTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  providerTagText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  clientBalanceWrap: { alignItems: 'flex-end' },
  clientBalance: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  clientBalanceUnit: { fontSize: 9, color: NEUTRAL.inkSoft, letterSpacing: 0.5 },

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

  // Change client
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#fde0e0',
    marginBottom: SPACING.lg,
  },
  changeRowText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 10,
    letterSpacing: 0.1,
  },

  // Amount
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1.5,
    borderColor: NEUTRAL.border,
    marginBottom: 10,
  },
  amountCurrency: {
    fontSize: 11,
    fontWeight: '700',
    color: NEUTRAL.inkSoft,
    letterSpacing: 0.5,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: NEUTRAL.ink,
    padding: 0,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  warnText: { fontSize: 11, color: COLORS.error, fontWeight: '500' },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    alignItems: 'center',
  },
  quickPillActive: { backgroundColor: NEUTRAL.ink, borderColor: NEUTRAL.ink },
  quickPillText: { fontSize: 12, fontWeight: '600', color: NEUTRAL.ink },
  quickPillTextActive: { color: NEUTRAL.inkOnFill },

  // Method picker (CASH vs MOMO)
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  methodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1.5,
    borderColor: NEUTRAL.borderSoft,
  },
  methodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: { fontSize: 12, fontWeight: '600', color: NEUTRAL.ink },
  methodSub: { fontSize: 10, color: NEUTRAL.inkSoft, marginTop: 1 },

  // CASH-mode reminder banner
  cashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: SPACING.md,
  },
  cashBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  cashBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1B5E20',
    fontWeight: '500',
    lineHeight: 16,
  },

  // Provider
  providerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  providerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1.5,
    borderColor: NEUTRAL.borderSoft,
  },
  providerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: NEUTRAL.inkMid },

  // Number
  numberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.lg,
  },
  numberInput: { flex: 1, fontSize: 14, color: NEUTRAL.ink, padding: 0 },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: {
    color: NEUTRAL.inkOnFill,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  helpText: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
});
