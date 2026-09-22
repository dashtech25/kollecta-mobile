import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useClients } from '../../../../hooks/useClients';
import {
  useInitiateDeposit,
  useVerifyDepositCode,
  useResendDepositCode,
  useRejectDeposit,
} from '../../../../hooks/useDeposit';
import { useGeolocation } from '../../../../hooks/useGeolocation';
import { useDashboardStats, useRecentActivity } from '../../../../hooks/useDashboard';
import { DecorBg } from '../../../../components/ui/DecorBg';
import {
  OrangeMoneyLogo,
  MtnMomoLogo,
  CashLogo,
} from '../../../../components/ui/PaymentLogos';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { Client, MomoProvider } from '../../../../types/client.types';
import {
  DepositMethod,
  DepositRequest,
} from '../../../../types/deposit.types';

type Step = 'form' | 'verify' | 'success';

const DAILY_TARGET_FCFA = 200_000;
const QUICK_AMOUNTS = [5_000, 10_000, 25_000, 50_000, 100_000];

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
};

const dayShortFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function DepositScreen() {
  // When the user lands here from a client detail page (or any deep link),
  // auto-pick the client so they don't have to scroll past the picker.
  const params = useLocalSearchParams<{
    clientId?: string;
    momoProvider?: string;
    momoNumber?: string;
  }>();

  const { data: clients, isLoading: loadingClients, refetch: refetchClients } = useClients();
  const { data: stats, refetch: refetchStats } = useDashboardStats();
  const { data: recent, refetch: refetchRecent } = useRecentActivity(80);
  const initiate = useInitiateDeposit();
  const verify = useVerifyDepositCode();
  const resend = useResendDepositCode();
  const reject = useRejectDeposit();
  const location = useGeolocation();

  // ── Flow state ──────────────────────────────────────
  const [step, setStep] = useState<Step>('form');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<DepositMethod>('CASH');
  const [momoProvider, setMomoProvider] = useState<MomoProvider>('ORANGE_MONEY');
  const [momoNumber, setMomoNumber] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // OTP step state
  const [otp, setOtp] = useState('');
  const [pendingDeposit, setPendingDeposit] = useState<DepositRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // ScrollView ref so we can scroll to top after auto-prefilling from URL params
  const scrollRef = useRef<ScrollView | null>(null);
  // Y-position of the client picker section, captured via onLayout so the
  // "Nouveau dépôt" CTA can scroll the user there instantly.
  const [pickerSectionY, setPickerSectionY] = useState(0);

  // Run auto-prefill from URL params at most once per arrival, and only after
  // the clients list is loaded so we can resolve the id to a Client object.
  const consumedParamsRef = useRef(false);
  useEffect(() => {
    if (consumedParamsRef.current) return;
    if (!params.clientId || !clients) return;
    const found = clients.find((c) => c.id === params.clientId);
    if (!found) return;

    consumedParamsRef.current = true;
    setSelectedClient(found);

    // Honor an explicit MoMo channel if the caller passed one (the per-channel
    // arrows on the client detail page do this); otherwise fall back to the
    // first channel the client has on file.
    if (params.momoProvider === 'ORANGE_MONEY' && found.orangeMoneyNumber) {
      setMomoProvider('ORANGE_MONEY');
      setMomoNumber(params.momoNumber ?? found.orangeMoneyNumber);
      setMethod('MOMO');
    } else if (params.momoProvider === 'MTN_MONEY' && found.mtnMoneyNumber) {
      setMomoProvider('MTN_MONEY');
      setMomoNumber(params.momoNumber ?? found.mtnMoneyNumber);
      setMethod('MOMO');
    } else if (found.orangeMoneyNumber) {
      setMomoProvider('ORANGE_MONEY');
      setMomoNumber(found.orangeMoneyNumber);
    } else if (found.mtnMoneyNumber) {
      setMomoProvider('MTN_MONEY');
      setMomoNumber(found.mtnMoneyNumber);
    }

    // Clear the params from the URL so a back-then-forward navigation doesn't
    // re-trigger the prefill on a now-different selection.
    router.setParams({ clientId: undefined, momoProvider: undefined, momoNumber: undefined });

    // Snap to the top of the form so the hero card is visible immediately.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [params.clientId, params.momoProvider, params.momoNumber, clients]);

  // Tick down OTP TTL ─ updates every second while in verify step
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (step !== 'verify' || !pendingDeposit?.otpExpiresAt) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    const update = () => {
      const ms = new Date(pendingDeposit.otpExpiresAt!).getTime() - Date.now();
      setSecondsLeft(Math.max(Math.floor(ms / 1000), 0));
    };
    update();
    tickRef.current = setInterval(update, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [step, pendingDeposit?.otpExpiresAt]);

  // ── Derived data ────────────────────────────────────
  // Coerce to Number defensively — Prisma Decimal columns serialize as strings,
  // and `string + number` would concatenate instead of adding.
  const todayAmount = Number(stats?.today.deposits.amount ?? 0) || 0;
  const todayCount = stats?.today.deposits.count ?? 0;
  const targetRatio = Math.min(todayAmount / DAILY_TARGET_FCFA, 1);
  const targetPct = Math.round(targetRatio * 100);
  const avgTicket = todayCount > 0 ? todayAmount / todayCount : 0;
  const remaining = Math.max(DAILY_TARGET_FCFA - todayAmount, 0);
  const selectedBalance = Number(selectedClient?.balance ?? 0) || 0;

  const trend = useMemo(() => buildSevenDayTrend(recent ?? []), [recent]);
  const maxTrendVal = Math.max(...trend.map((d) => d.amount), 1);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const numericAmount = parseInt(amount) || 0;
  const projectedToday = todayAmount + numericAmount;
  const projectedRatio = Math.min(projectedToday / DAILY_TARGET_FCFA, 1);

  // ── Handlers ────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchClients(), refetchStats(), refetchRecent()]);
    setRefreshing(false);
  };

  const handlePickClient = (client: Client) => {
    setSelectedClient(client);
    if (client.orangeMoneyNumber) {
      setMomoNumber(client.orangeMoneyNumber);
      setMomoProvider('ORANGE_MONEY');
    } else if (client.mtnMoneyNumber) {
      setMomoNumber(client.mtnMoneyNumber);
      setMomoProvider('MTN_MONEY');
    }
    setSearch('');
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

  const resetFlow = () => {
    setStep('form');
    setSelectedClient(null);
    setAmount('');
    setNote('');
    setMethod('CASH');
    setMomoNumber('');
    setOtp('');
    setPendingDeposit(null);
  };

  const handleInitiate = async () => {
    if (!selectedClient) return Alert.alert('Erreur', 'Veuillez sélectionner un client');
    if (!numericAmount || numericAmount < 1)
      return Alert.alert('Erreur', 'Veuillez entrer un montant valide');
    if (method === 'MOMO' && !momoNumber.trim()) {
      return Alert.alert('Erreur', 'Numéro Mobile Money requis pour ce mode');
    }

    try {
      const result = await initiate.mutateAsync({
        clientId: selectedClient.id,
        amount: numericAmount,
        method,
        momoProvider: method === 'MOMO' ? momoProvider : undefined,
        momoNumber: method === 'MOMO' ? momoNumber.trim() : undefined,
        note: note.trim() || undefined,
        latitude: location.latitude ?? undefined,
        longitude: location.longitude ?? undefined,
      });
      setPendingDeposit(result);
      setOtp('');
      setStep('verify');
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Le dépôt n\'a pas pu être initié',
      );
    }
  };

  const handleVerify = async () => {
    if (!pendingDeposit) return;
    if (otp.length !== 6) return Alert.alert('Erreur', 'Le code doit contenir 6 chiffres');
    try {
      const result = await verify.mutateAsync({
        id: pendingDeposit.id,
        code: otp,
      });
      setPendingDeposit(result);
      setStep('success');
    } catch (error: any) {
      Alert.alert(
        'Code invalide',
        error?.response?.data?.message ||
          'Le code communiqué par le client est incorrect ou expiré.',
      );
      setOtp('');
    }
  };

  const handleResend = async () => {
    if (!pendingDeposit) return;
    try {
      const result = await resend.mutateAsync({ id: pendingDeposit.id });
      setPendingDeposit(result);
      setOtp('');
      Alert.alert('Code renvoyé', 'Un nouveau code a été envoyé au client par WhatsApp.');
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error?.response?.data?.message || 'Impossible de renvoyer le code',
      );
    }
  };

  const handleCancelDeposit = () => {
    if (!pendingDeposit) {
      resetFlow();
      return;
    }
    Alert.alert(
      'Annuler le dépôt',
      'Êtes-vous sûr ? Le code envoyé au client sera invalidé.',
      [
        { text: 'Continuer', style: 'cancel' },
        {
          text: 'Annuler le dépôt',
          style: 'destructive',
          onPress: async () => {
            try {
              await reject.mutateAsync({
                id: pendingDeposit.id,
                reason: 'Annulé par le collecteur',
              });
            } catch {
              // Best effort — even if reject fails, leave the form
            }
            resetFlow();
          },
        },
      ],
    );
  };

  const openReceipt = () => {
    if (pendingDeposit?.receiptUrl) {
      Linking.openURL(pendingDeposit.receiptUrl).catch(() =>
        Alert.alert('Erreur', "Impossible d'ouvrir le reçu"),
      );
    }
  };

  // ── Render ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          step === 'form' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={NEUTRAL.ink}
            />
          ) : undefined
        }
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          {selectedClient || step !== 'form' ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (step === 'verify') {
                  handleCancelDeposit();
                } else if (step === 'success') {
                  resetFlow();
                } else if (selectedClient) {
                  setSelectedClient(null);
                  setAmount('');
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="arrow-back" size={20} color={NEUTRAL.ink} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconBtn}>
              <Ionicons name="arrow-down-circle" size={20} color={NEUTRAL.ink} />
            </View>
          )}
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Encaissement</Text>
            <Text style={styles.topBarTitle}>
              {step === 'verify'
                ? 'Validation OTP'
                : step === 'success'
                  ? 'Dépôt confirmé'
                  : selectedClient
                    ? 'Nouveau dépôt'
                    : 'Dépôts'}
            </Text>
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

        {/* ── Step indicator (only in flow) ── */}
        {(step === 'verify' || step === 'success' || selectedClient) && (
          <StepIndicator step={step} />
        )}

        {/* ── STEP: Success ── */}
        {step === 'success' && pendingDeposit && (
          <SuccessPanel
            deposit={pendingDeposit}
            onClose={resetFlow}
            onOpenReceipt={openReceipt}
          />
        )}

        {/* ── STEP: Verify OTP ── */}
        {step === 'verify' && pendingDeposit && (
          <VerifyPanel
            deposit={pendingDeposit}
            otp={otp}
            setOtp={setOtp}
            secondsLeft={secondsLeft}
            verifying={verify.isPending}
            resending={resend.isPending}
            onVerify={handleVerify}
            onResend={handleResend}
            onCancel={handleCancelDeposit}
          />
        )}

        {/* ── STEP: Form ── */}
        {step === 'form' && (
          <>
            {/* Hero */}
            <View style={styles.heroCard}>
              <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
              <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>
                  {selectedClient ? 'Aperçu après dépôt' : "Collecté aujourd'hui"}
                </Text>
                <View style={styles.heroAmountRow}>
                  <Text style={styles.heroAmount}>
                    {fmtAmount(selectedClient ? projectedToday : todayAmount)}
                  </Text>
                </View>
                <Text style={styles.heroSub}>
                  Objectif {fmtCompact(DAILY_TARGET_FCFA)} FCFA ·{' '}
                  {selectedClient ? Math.round(projectedRatio * 100) : targetPct}%
                </Text>
                <View style={styles.heroDivider} />
                <Text style={styles.heroFooter}>
                  {selectedClient && numericAmount > 0
                    ? `+ ${fmtAmount(numericAmount)} en cours`
                    : `${todayCount} dépôt${todayCount > 1 ? 's' : ''} · reste ${fmtCompact(remaining)} FCFA`}
                </Text>
              </View>

              <View style={styles.heroArcWrap}>
                <ProgressArc
                  ratio={selectedClient ? projectedRatio : targetRatio}
                  size={104}
                  strokeWidth={8}
                  trackColor="rgba(255,255,255,0.15)"
                  progressColor={NEUTRAL.inkOnFill}
                />
                <View style={styles.heroArcCenter} pointerEvents="none">
                  <Text style={styles.heroArcPct}>
                    {selectedClient ? Math.round(projectedRatio * 100) : targetPct}%
                  </Text>
                  <Text style={styles.heroArcLabel}>du jour</Text>
                </View>
              </View>
            </View>

            {!selectedClient ? (
              <>
                {/* Primary CTA: jump straight to the client picker */}
                <TouchableOpacity
                  style={styles.newDepositCta}
                  activeOpacity={0.85}
                  onPress={() =>
                    scrollRef.current?.scrollTo({
                      y: Math.max(pickerSectionY - 12, 0),
                      animated: true,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Nouveau dépôt — choisir un client"
                >
                  <View style={styles.newDepositIcon}>
                    <Ionicons name="add" size={20} color={COLORS.white} />
                  </View>
                  <View style={styles.newDepositMeta}>
                    <Text style={styles.newDepositTitle}>Nouveau dépôt</Text>
                    <Text style={styles.newDepositSub}>
                      Sélectionnez un client pour démarrer
                    </Text>
                  </View>
                  <Ionicons name="arrow-down" size={18} color={NEUTRAL.inkMid} />
                </TouchableOpacity>

                {/* KPI row */}
                <View style={styles.kpiRow}>
                  <View style={styles.kpiCard}>
                    <DecorBg variant="dots" anchor="top-right" color={COLORS.primary} opacity={0.08} width={70} height={70} />
                    <Text style={styles.kpiLabel}>Ticket moyen</Text>
                    <Text style={styles.kpiValue}>
                      {avgTicket > 0 ? fmtCompact(avgTicket) : '—'}
                    </Text>
                    <Text style={styles.kpiUnit}>FCFA / dépôt</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <DecorBg variant="arc" anchor="bottom-right" color={COLORS.primary} opacity={0.1} width={100} height={100} />
                    <Text style={styles.kpiLabel}>Ce mois</Text>
                    <Text style={styles.kpiValue}>
                      {fmtCompact(stats?.month.deposits.amount ?? 0)}
                    </Text>
                    <Text style={styles.kpiUnit}>
                      FCFA · {stats?.month.deposits.count ?? 0} dépôts
                    </Text>
                  </View>
                </View>

                {/* Trend */}
                <View style={styles.trendCard}>
                  <DecorBg variant="grid" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={200} />
                  <View style={styles.trendHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Tendance 7 jours</Text>
                      <Text style={styles.cardSub}>FCFA déposés par jour</Text>
                    </View>
                    <View style={styles.trendLegend}>
                      <View style={styles.trendLegendItem}>
                        <View style={[styles.trendDot, { backgroundColor: COLORS.primary }]} />
                        <Text style={styles.trendLegendText}>Dépôts</Text>
                      </View>
                      <View style={styles.trendLegendItem}>
                        <View style={[styles.trendDot, { backgroundColor: NEUTRAL.ink }]} />
                        <Text style={styles.trendLegendText}>Aujourd'hui</Text>
                      </View>
                    </View>
                  </View>
                  <TrendChart trend={trend} maxValue={maxTrendVal} />
                </View>

                {/* Client picker */}
                <View
                  style={styles.sectionHeader}
                  onLayout={(e) => setPickerSectionY(e.nativeEvent.layout.y)}
                >
                  <Text style={styles.sectionTitle}>Sélectionner un client</Text>
                  <Text style={styles.sectionCount}>
                    {filteredClients.length} / {clients?.length ?? 0}
                  </Text>
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
                      Essayez un autre mot-clé ou ajoutez un nouveau client.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.clientList}>
                    {filteredClients.map((c, idx) => (
                      <TouchableOpacity
                        key={c.id}
                        activeOpacity={0.78}
                        onPress={() => handlePickClient(c)}
                        style={[styles.clientRow, idx > 0 && styles.clientRowDivider]}
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
                          <Text style={styles.clientPhone} numberOfLines={1}>
                            {c.phone}
                          </Text>
                        </View>
                        <View style={styles.clientBalanceWrap}>
                          <Text style={styles.clientBalance}>
                            {fmtCompact(c.balance)}
                          </Text>
                          <Text style={styles.clientBalanceUnit}>FCFA</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={NEUTRAL.inkSoft} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Selected client */}
                <View style={styles.selectedCard}>
                  <DecorBg variant="diagonals" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={140} />
                  <View style={styles.selectedHeader}>
                    <View style={styles.selectedAvatar}>
                      <Text style={styles.selectedAvatarText}>
                        {(selectedClient.firstName[0] ?? '') +
                          (selectedClient.lastName[0] ?? '')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedName} numberOfLines={1}>
                        {selectedClient.firstName} {selectedClient.lastName}
                      </Text>
                      <Text style={styles.selectedPhone}>{selectedClient.phone}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedClient(null)}
                      style={styles.changePill}
                    >
                      <Ionicons name="swap-horizontal" size={12} color={COLORS.primary} />
                      <Text style={styles.changePillText}>Changer</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.selectedSplit}>
                    <View style={styles.selectedSplitItem}>
                      <Text style={styles.selectedSplitLabel}>Solde actuel</Text>
                      <Text style={styles.selectedSplitValue}>
                        {fmtAmount(selectedBalance)}
                      </Text>
                    </View>
                    <View style={styles.selectedSplitDivider} />
                    <View style={styles.selectedSplitItem}>
                      <Text style={styles.selectedSplitLabel}>Après dépôt</Text>
                      <Text style={[styles.selectedSplitValue, { color: COLORS.primary }]}>
                        {fmtAmount(selectedBalance + numericAmount)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Method selector */}
                <Text style={styles.sectionTitle}>Mode de dépôt</Text>
                <View style={styles.methodRow}>
                  <MethodCard
                    active={method === 'CASH'}
                    onPress={() => setMethod('CASH')}
                    icon="cash"
                    iconColor="#2E7D32"
                    bg="#E8F5E9"
                    label="Espèces"
                    sub="Cash en main"
                  />
                  <MethodCard
                    active={method === 'MOMO'}
                    onPress={() => setMethod('MOMO')}
                    icon="phone-portrait"
                    iconColor="#E65100"
                    bg="#FFF3E0"
                    label="Mobile Money"
                    sub="Orange / MTN"
                  />
                </View>

                {/* Amount */}
                <Text style={styles.sectionTitle}>Montant du dépôt</Text>
                <View style={styles.amountCard}>
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

                <View style={styles.quickRow}>
                  {QUICK_AMOUNTS.map((q) => {
                    const active = numericAmount === q;
                    return (
                      <TouchableOpacity
                        key={q}
                        style={[styles.quickPill, active && styles.quickPillActive]}
                        onPress={() => setAmount(String(q))}
                        activeOpacity={0.78}
                      >
                        <Text style={[styles.quickPillText, active && styles.quickPillTextActive]}>
                          {fmtCompact(q)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* MoMo number input — only when MOMO */}
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
                                { backgroundColor: isOrange ? '#E65100' : '#F57F17' },
                              ]}
                            >
                              <Ionicons name="phone-portrait" size={14} color="#fff" />
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

                {/* Note */}
                <Text style={styles.sectionTitle}>Note (optionnel)</Text>
                <View style={styles.noteWrap}>
                  <Ionicons name="document-text-outline" size={16} color={NEUTRAL.inkSoft} />
                  <TextInput
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Détail du dépôt…"
                    placeholderTextColor={NEUTRAL.inkSoft}
                    maxLength={120}
                  />
                </View>

                {/* Help banner */}
                <View style={styles.helpBanner}>
                  <View style={styles.helpIcon}>
                    <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                  </View>
                  <Text style={styles.helpText}>
                    Un code à 6 chiffres sera envoyé au client par WhatsApp pour valider la
                    transaction.
                  </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!numericAmount || initiate.isPending) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleInitiate}
                  disabled={!numericAmount || initiate.isPending}
                  activeOpacity={0.85}
                >
                  {initiate.isPending ? (
                    <ActivityIndicator color={NEUTRAL.inkOnFill} />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={16} color={NEUTRAL.inkOnFill} />
                      <Text style={styles.submitBtnText}>
                        Envoyer le code · {numericAmount > 0 ? fmtAmount(numericAmount) : 'dépôt'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={resetFlow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'form', label: 'Saisie', icon: 'create-outline' },
    { key: 'verify', label: 'Code OTP', icon: 'logo-whatsapp' },
    { key: 'success', label: 'Confirmé', icon: 'checkmark-circle' },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);
  return (
    <View style={stepperStyles.row}>
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <View style={stepperStyles.item}>
              <View
                style={[
                  stepperStyles.dot,
                  done && stepperStyles.dotDone,
                  active && stepperStyles.dotActive,
                ]}
              >
                <Ionicons
                  name={s.icon}
                  size={12}
                  color={done || active ? NEUTRAL.inkOnFill : NEUTRAL.inkSoft}
                />
              </View>
              <Text
                style={[
                  stepperStyles.label,
                  (done || active) && stepperStyles.labelActive,
                ]}
              >
                {s.label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                style={[
                  stepperStyles.bar,
                  i < currentIdx && stepperStyles.barDone,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function VerifyPanel({
  deposit,
  otp,
  setOtp,
  secondsLeft,
  verifying,
  resending,
  onVerify,
  onResend,
  onCancel,
}: {
  deposit: DepositRequest;
  otp: string;
  setOtp: (v: string) => void;
  secondsLeft: number;
  verifying: boolean;
  resending: boolean;
  onVerify: () => void;
  onResend: () => void;
  onCancel: () => void;
}) {
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const expired = secondsLeft <= 0;
  return (
    <>
      <View style={styles.heroCard}>
        <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>Code envoyé via WhatsApp</Text>
          <Text style={styles.heroAmount}>{fmtAmount(deposit.amount)}</Text>
          <Text style={styles.heroSub}>
            à {deposit.client?.firstName} {deposit.client?.lastName}
          </Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroFooter}>
            {expired
              ? 'Code expiré — renvoyez-en un nouveau.'
              : `Valable encore ${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
          </Text>
        </View>
        <View style={styles.heroIconWrap}>
          <Ionicons name="logo-whatsapp" size={56} color="rgba(255,255,255,0.9)" />
        </View>
      </View>

      <View style={styles.otpCard}>
        <DecorBg variant="diagonals" anchor="fill" color={COLORS.primary} opacity={0.03} width={400} height={220} />
        <Text style={styles.cardTitle}>Saisir le code communiqué par le client</Text>
        <Text style={styles.cardSub}>
          Demandez au client de vous lire les 6 chiffres reçus sur WhatsApp.
        </Text>

        <View style={styles.otpRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.otpCell,
                otp.length === i && styles.otpCellActive,
                otp.length > i && styles.otpCellFilled,
              ]}
            >
              <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
            </View>
          ))}
        </View>
        <TextInput
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={styles.otpHiddenInput}
          accessibilityLabel="Code OTP à 6 chiffres"
        />

        <View style={styles.otpFooter}>
          <Text style={styles.otpFooterText}>
            {expired ? 'Code expiré' : `Expire dans ${minutes}:${String(secs).padStart(2, '0')}`}
          </Text>
          <TouchableOpacity onPress={onResend} disabled={resending} hitSlop={8}>
            <Text style={[styles.otpResend, resending && { opacity: 0.5 }]}>
              {resending ? 'Renvoi…' : 'Renvoyer le code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.submitBtn,
          (otp.length !== 6 || verifying || expired) && styles.submitBtnDisabled,
        ]}
        onPress={onVerify}
        disabled={otp.length !== 6 || verifying || expired}
        activeOpacity={0.85}
      >
        {verifying ? (
          <ActivityIndicator color={NEUTRAL.inkOnFill} />
        ) : (
          <>
            <Ionicons name="lock-open" size={16} color={NEUTRAL.inkOnFill} />
            <Text style={styles.submitBtnText}>Valider et sceller le dépôt</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelBtnText}>Annuler le dépôt</Text>
      </TouchableOpacity>
    </>
  );
}

function SuccessPanel({
  deposit,
  onClose,
  onOpenReceipt,
}: {
  deposit: DepositRequest;
  onClose: () => void;
  onOpenReceipt: () => void;
}) {
  return (
    <>
      <View style={styles.successHero}>
        <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
        <View style={styles.successCheck}>
          <Ionicons name="checkmark" size={36} color="#2E7D32" />
        </View>
        <Text style={styles.successAmount}>{fmtAmount(deposit.amount)}</Text>
        <Text style={styles.successSub}>
          déposés pour {deposit.client?.firstName} {deposit.client?.lastName}
        </Text>
        <View style={styles.successDivider} />
        <Text style={styles.successFooter}>
          Le reçu PDF est en cours d'envoi au client par WhatsApp.
        </Text>
      </View>

      <View style={styles.cardList}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mode</Text>
          <Text style={styles.summaryValue}>
            {deposit.method === 'CASH'
              ? 'Espèces'
              : deposit.momoProvider === 'ORANGE_MONEY'
                ? 'Orange Money'
                : 'MTN MoMo'}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowDivider]}>
          <Text style={styles.summaryLabel}>Référence</Text>
          <Text style={[styles.summaryValue, styles.summaryMono]} numberOfLines={1}>
            {deposit.id.slice(0, 12).toUpperCase()}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowDivider]}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>
            {deposit.completedAt
              ? new Date(deposit.completedAt).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '—'}
          </Text>
        </View>
      </View>

      {deposit.receiptUrl && (
        <TouchableOpacity
          style={styles.receiptBtn}
          onPress={onOpenReceipt}
          activeOpacity={0.85}
        >
          <Ionicons name="document-text-outline" size={16} color={NEUTRAL.ink} />
          <Text style={styles.receiptBtnText}>Ouvrir le reçu PDF</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={onClose} activeOpacity={0.85}>
        <Ionicons name="add-circle" size={16} color={NEUTRAL.inkOnFill} />
        <Text style={styles.submitBtnText}>Nouveau dépôt</Text>
      </TouchableOpacity>
    </>
  );
}

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

// ──────────────── Helpers ────────────────

function buildSevenDayTrend(
  transactions: { type: string; amount: number; createdAt: string }[],
) {
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
  transactions.forEach((tx) => {
    if (tx.type !== 'DEPOSIT') return;
    const d = new Date(tx.createdAt);
    d.setHours(0, 0, 0, 0);
    const slot = days.find((x) => x.date.getTime() === d.getTime());
    if (slot) slot.amount += tx.amount;
  });
  return days.map(({ day, amount, isToday }) => ({ day, amount, isToday }));
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NEUTRAL.bg },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },

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
  heroAmountRow: { minHeight: 44, justifyContent: 'center', marginTop: 6 },
  heroAmount: {
    color: NEUTRAL.inkOnFill,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10,
  },
  heroFooter: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  heroIconWrap: { width: 90, alignItems: 'center', justifyContent: 'center' },
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

  // Primary "Nouveau dépôt" CTA card
  newDepositCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  newDepositIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDepositMeta: {
    flex: 1,
  },
  newDepositTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NEUTRAL.ink,
    letterSpacing: -0.1,
  },
  newDepositSub: {
    fontSize: 12,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },

  // KPI row
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  kpiCard: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
  },
  kpiLabel: { fontSize: 11, color: NEUTRAL.inkMid, fontWeight: '500' },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  kpiUnit: { fontSize: 10, color: NEUTRAL.inkSoft, marginTop: 2 },

  // Trend
  trendCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
  cardSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  trendLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trendLegendText: { fontSize: 10, color: NEUTRAL.inkMid, fontWeight: '600' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  sectionCount: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
  },

  // Search + clients
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
  clientPhone: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  clientBalanceWrap: { alignItems: 'flex-end' },
  clientBalance: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  clientBalanceUnit: { fontSize: 9, color: NEUTRAL.inkSoft, letterSpacing: 0.5 },

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

  // Selected client
  selectedCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  selectedAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.inkOnFill,
    letterSpacing: 0.5,
  },
  selectedName: { fontSize: 15, fontWeight: '700', color: NEUTRAL.ink },
  selectedPhone: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  changePill: {
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
  changePillText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  selectedSplit: {
    flexDirection: 'row',
    backgroundColor: NEUTRAL.surfaceSunken,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    alignItems: 'center',
  },
  selectedSplitItem: { flex: 1 },
  selectedSplitDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: NEUTRAL.border,
    marginHorizontal: 10,
  },
  selectedSplitLabel: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  selectedSplitValue: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },

  // Method picker
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
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

  // Amount input
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
    marginBottom: 12,
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
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  quickPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
  },
  quickPillActive: { backgroundColor: NEUTRAL.ink, borderColor: NEUTRAL.ink },
  quickPillText: { fontSize: 12, fontWeight: '600', color: NEUTRAL.ink },
  quickPillTextActive: { color: NEUTRAL.inkOnFill },

  // Provider picker (only when MOMO)
  providerRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
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
  providerLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
  },

  // Number / Note input
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
    marginBottom: SPACING.md,
  },
  numberInput: { flex: 1, fontSize: 14, color: NEUTRAL.ink, padding: 0 },
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
  },
  noteInput: { flex: 1, fontSize: 13, color: NEUTRAL.ink, padding: 0 },

  // Help banner
  helpBanner: {
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
  helpIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#1B5E20',
    fontWeight: '500',
    lineHeight: 16,
  },

  // Submit + cancel
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
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, color: NEUTRAL.inkSoft, fontWeight: '500' },

  // OTP card
  otpCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: NEUTRAL.borderSoft,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellActive: { borderColor: COLORS.primary, backgroundColor: '#fff1f1' },
  otpCellFilled: { borderColor: NEUTRAL.ink, backgroundColor: NEUTRAL.surface },
  otpDigit: {
    fontSize: 24,
    fontWeight: '800',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  otpHiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
  },
  otpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  otpFooterText: { fontSize: 11, color: NEUTRAL.inkSoft, fontWeight: '500' },
  otpResend: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  // Success
  successHero: {
    backgroundColor: '#2E7D32',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  successCheck: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  successSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  successDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  successFooter: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  cardList: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  summaryRowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  summaryLabel: { fontSize: 11, color: NEUTRAL.inkSoft, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
  summaryMono: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    fontSize: 12,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: NEUTRAL.border,
    marginBottom: 12,
  },
  receiptBtnText: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
});

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: SPACING.md,
  },
  item: { alignItems: 'center', gap: 6 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1.5,
    borderColor: NEUTRAL.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dotDone: { backgroundColor: NEUTRAL.ink, borderColor: NEUTRAL.ink },
  label: {
    fontSize: 9,
    color: NEUTRAL.inkSoft,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelActive: { color: NEUTRAL.ink },
  bar: {
    flex: 1,
    height: 2,
    backgroundColor: NEUTRAL.borderSoft,
    marginHorizontal: 4,
    marginBottom: 18,
  },
  barDone: { backgroundColor: NEUTRAL.ink },
});

const trendStyles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
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
  barEmpty: {
    backgroundColor: NEUTRAL.borderSoft,
    minHeight: 4,
  },
  barToday: {
    backgroundColor: NEUTRAL.ink,
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
  labelToday: {
    color: NEUTRAL.ink,
    fontWeight: '700',
  },
});
