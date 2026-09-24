import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from '../../../services/secure-storage';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useRangeReport } from '../../../hooks/useReports';
import { DecorBg } from '../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { API_URL } from '../../../constants/config';

// ──────────────── Date helpers ────────────────

type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: 'last7', label: '7 derniers jours' },
  { key: 'last30', label: '30 derniers jours' },
  { key: 'thisMonth', label: 'Ce mois' },
  { key: 'lastMonth', label: 'Mois dernier' },
  { key: 'custom', label: 'Personnalisé' },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getPresetRange(preset: Preset): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return { start: today, end: endOfDay(now) };
    case 'yesterday': {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start, end: endOfDay(start) };
    }
    case 'last7': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(now) };
    }
    case 'last30': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now) };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: endOfDay(now) };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'custom':
    default:
      return { start: today, end: endOfDay(now) };
  }
}

function fmtAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ──────────────── Screen ────────────────

export default function ReportsScreen() {
  const [preset, setPreset] = useState<Preset>('thisMonth');
  const initial = getPresetRange('thisMonth');
  const [start, setStart] = useState<Date>(initial.start);
  const [end, setEnd] = useState<Date>(initial.end);
  const [downloading, setDownloading] = useState(false);

  // iOS uses an inline DateTimePicker inside a Modal.
  const [iosPicker, setIosPicker] = useState<null | 'start' | 'end'>(null);

  const { data, isLoading, refetch, isFetching } = useRangeReport(start, end);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = getPresetRange(p);
      setStart(r.start);
      setEnd(r.end);
    }
  };

  const openDatePicker = (target: 'start' | 'end') => {
    const current = target === 'start' ? start : end;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate: target === 'start' ? end : new Date(),
        minimumDate: target === 'end' ? start : undefined,
        onChange: (_, selected) => {
          if (!selected) return;
          if (target === 'start') setStart(startOfDay(selected));
          else setEnd(endOfDay(selected));
        },
      });
    } else {
      setIosPicker(target);
    }
  };

  const handleIosPickerChange = (date: Date) => {
    if (iosPicker === 'start') setStart(startOfDay(date));
    else if (iosPicker === 'end') setEnd(endOfDay(date));
  };

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const filename = `rapport-${fmtIsoDate(start)}_${fmtIsoDate(end)}.xlsx`;
      const fileUri = FileSystem.documentDirectory + filename;
      const url = `${API_URL}/reports/range/excel?startDate=${fmtIsoDate(start)}&endDate=${fmtIsoDate(end)}`;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (result.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Partager le rapport',
            UTI: 'org.openxmlformats.spreadsheetml.sheet',
          });
        }
      } else {
        Alert.alert('Erreur', 'Impossible de télécharger le rapport.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Échec du téléchargement.');
    } finally {
      setDownloading(false);
    }
  };

  const summary = data?.summary;
  const daily = data?.daily ?? [];
  const topClients = data?.topClients ?? [];
  const txCount = (summary?.totalDeposits ?? 0) + (summary?.totalWithdrawals ?? 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={NEUTRAL.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rapport</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel="Actualiser"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={18} color={NEUTRAL.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date range hero */}
        <View style={styles.heroCard}>
          <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
          <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />

          <Text style={styles.heroLabel}>Période sélectionnée</Text>
          <Text style={styles.heroRange}>
            {fmtDate(start)} <Text style={styles.heroRangeSep}>→</Text> {fmtDate(end)}
          </Text>
          <Text style={styles.heroSub}>
            {txCount} {txCount > 1 ? 'opérations' : 'opération'} ·{' '}
            {summary ? fmtAmount(summary.totalDepositAmount + summary.totalWithdrawalAmount) : '—'}
          </Text>
        </View>

        {/* Quick preset chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          accessibilityRole="tablist"
          accessibilityLabel="Période rapide"
        >
          {PRESETS.map((p) => {
            const active = preset === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => applyPreset(p.key)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom-range editor */}
        {preset === 'custom' && (
          <View style={styles.customRow}>
            <DateField
              label="Date début"
              value={start}
              onPress={() => openDatePicker('start')}
            />
            <View style={styles.customArrow}>
              <Ionicons name="arrow-forward" size={14} color={NEUTRAL.inkSoft} />
            </View>
            <DateField
              label="Date fin"
              value={end}
              onPress={() => openDatePicker('end')}
            />
          </View>
        )}

        {/* KPI grid */}
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.kpiGrid}>
          <KpiCard
            icon="arrow-down"
            label="Dépôts"
            value={summary ? String(summary.totalDeposits) : '—'}
            sub={summary ? fmtCompact(summary.totalDepositAmount) + ' FCFA' : ''}
            isLoading={isLoading}
          />
          <KpiCard
            icon="arrow-up"
            label="Retraits"
            value={summary ? String(summary.totalWithdrawals) : '—'}
            sub={summary ? fmtCompact(summary.totalWithdrawalAmount) + ' FCFA' : ''}
            isLoading={isLoading}
          />
          <KpiCard
            icon="trending-up-outline"
            label="Solde net"
            value={summary ? signedCompact(summary.netFlow) : '—'}
            sub="Dépôts − Retraits"
            isLoading={isLoading}
            highlight={summary && summary.netFlow >= 0}
          />
          <KpiCard
            icon="receipt-outline"
            label="Ticket moyen"
            value={summary ? fmtCompact(summary.avgDepositTicket) : '—'}
            sub="par dépôt"
            isLoading={isLoading}
          />
        </View>

        {/* Daily activity bars */}
        <Text style={styles.sectionTitle}>Activité par jour</Text>
        <View style={styles.dailyCard}>
          <DecorBg variant="grid" anchor="fill" color={COLORS.primary} opacity={0.04} width={400} height={160} />
          {isLoading ? (
            <View style={styles.dailyLoading}>
              <ActivityIndicator color={NEUTRAL.ink} />
            </View>
          ) : daily.length === 0 ? (
            <EmptyBlock
              icon="bar-chart-outline"
              title="Aucune activité sur la période"
              desc="Sélectionnez une autre période pour voir des données."
            />
          ) : (
            <DailyChart data={daily} />
          )}
        </View>

        {/* Top clients */}
        <Text style={styles.sectionTitle}>Top clients</Text>
        <View style={styles.topCard}>
          {isLoading ? (
            <View style={styles.dailyLoading}>
              <ActivityIndicator color={NEUTRAL.ink} />
            </View>
          ) : topClients.length === 0 ? (
            <EmptyBlock
              icon="people-outline"
              title="Aucun client n'a déposé sur cette période"
            />
          ) : (
            topClients.map((c, idx) => (
              <TopClientRow key={c.id} client={c} rank={idx + 1} isFirst={idx === 0} />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky download bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
            onPress={downloadExcel}
            disabled={downloading || isLoading || (txCount === 0)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Télécharger le rapport au format Excel"
          >
            {downloading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text style={styles.downloadBtnText}>Télécharger en Excel</Text>
              </>
            )}
          </TouchableOpacity>
          {(isFetching && !isLoading) && (
            <Text style={styles.refreshHint}>Mise à jour…</Text>
          )}
        </View>
      </SafeAreaView>

      {/* iOS date picker modal */}
      {iosPicker !== null && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" onRequestClose={() => setIosPicker(null)}>
          <View style={styles.iosPickerRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIosPicker(null)}
            />
            <View style={styles.iosPickerSheet}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setIosPicker(null)}>
                  <Text style={styles.iosPickerCancel}>Annuler</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>
                  {iosPicker === 'start' ? 'Date début' : 'Date fin'}
                </Text>
                <TouchableOpacity onPress={() => setIosPicker(null)}>
                  <Text style={styles.iosPickerDone}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosPicker === 'start' ? start : end}
                mode="date"
                display="spinner"
                maximumDate={iosPicker === 'start' ? end : new Date()}
                minimumDate={iosPicker === 'end' ? start : undefined}
                onChange={(_, selected) => {
                  if (selected) handleIosPickerChange(selected);
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function DateField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: Date;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.dateField}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${fmtDate(value)}, toucher pour modifier`}
    >
      <Text style={styles.dateFieldLabel}>{label}</Text>
      <View style={styles.dateFieldValueRow}>
        <Ionicons name="calendar-outline" size={14} color={NEUTRAL.ink} />
        <Text style={styles.dateFieldValue}>{fmtDate(value)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  isLoading,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
  isLoading?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.kpiCard, highlight && styles.kpiCardHighlight]}>
      <View style={styles.kpiHeader}>
        <View style={styles.kpiIconWrap}>
          <Ionicons name={icon} size={13} color={NEUTRAL.ink} />
        </View>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={NEUTRAL.ink} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
      ) : (
        <Text style={styles.kpiValue}>{value}</Text>
      )}
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function DailyChart({ data }: { data: Array<{ date: string; depositAmount: number }> }) {
  const max = Math.max(...data.map((d) => d.depositAmount), 1);
  const peakIdx = data.reduce(
    (best, d, i) => (d.depositAmount > data[best].depositAmount ? i : best),
    0,
  );

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBars}>
        {data.map((d, i) => {
          const ratio = d.depositAmount / max;
          const height = Math.max(ratio * 92, 4);
          const isPeak = i === peakIdx && d.depositAmount > 0;
          return (
            <View key={d.date} style={styles.chartCol}>
              <View
                style={[styles.chartBar, { height }, isPeak && styles.chartBarPeak]}
                accessibilityLabel={`${d.date}: ${fmtCompact(d.depositAmount)} FCFA`}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabelText}>{shortDate(data[0]?.date)}</Text>
        {data.length > 2 && (
          <Text style={styles.chartLabelText}>
            {shortDate(data[Math.floor(data.length / 2)]?.date)}
          </Text>
        )}
        {data.length > 1 && (
          <Text style={styles.chartLabelText}>{shortDate(data[data.length - 1]?.date)}</Text>
        )}
      </View>
    </View>
  );
}

function TopClientRow({
  client,
  rank,
  isFirst,
}: {
  client: { id: string; name: string; depositAmount: number; depositCount: number };
  rank: number;
  isFirst: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.topRow, !isFirst && styles.topRowDivider]}
      onPress={() => router.push(`/(collector)/(tabs)/clients/${client.id}`)}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`${client.name}, ${client.depositCount} dépôts pour ${fmtAmount(client.depositAmount)}`}
    >
      <View style={styles.topRank}>
        <Text style={styles.topRankText}>{rank}</Text>
      </View>
      <View style={styles.topMeta}>
        <Text style={styles.topName} numberOfLines={1}>
          {client.name}
        </Text>
        <Text style={styles.topSub}>
          {client.depositCount} {client.depositCount > 1 ? 'dépôts' : 'dépôt'}
        </Text>
      </View>
      <Text style={styles.topAmount}>{fmtCompact(client.depositAmount)} FCFA</Text>
    </TouchableOpacity>
  );
}

function EmptyBlock({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc?: string;
}) {
  return (
    <View style={styles.emptyBlock}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={22} color={NEUTRAL.inkSoft} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {desc ? <Text style={styles.emptyDesc}>{desc}</Text> : null}
    </View>
  );
}

// ──────────────── Helpers ────────────────

function signedCompact(n: number): string {
  if (n > 0) return '+' + fmtCompact(n);
  if (n < 0) return '−' + fmtCompact(Math.abs(n));
  return '0';
}

function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ──────────────── Styles ────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEUTRAL.bg },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
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

  // Hero
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  heroRange: {
    color: NEUTRAL.inkOnFill,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: -0.3,
  },
  heroRangeSep: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 6,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: SPACING.md,
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
  chipTextActive: {
    color: NEUTRAL.inkOnFill,
  },

  // Custom range
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  customArrow: {
    width: 24,
    alignItems: 'center',
  },
  dateField: {
    flex: 1,
    backgroundColor: NEUTRAL.surface,
    borderWidth: 1,
    borderColor: NEUTRAL.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: NEUTRAL.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateFieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dateFieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 12,
    marginTop: 4,
    letterSpacing: 0.1,
  },

  // KPI grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
  },
  kpiCardHighlight: {
    borderColor: COLORS.primary,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  kpiIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: NEUTRAL.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },

  // Daily chart card
  dailyCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    minHeight: 130,
  },
  dailyLoading: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  chartWrap: {
    width: '100%',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
  },
  chartCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    backgroundColor: NEUTRAL.ink,
    borderRadius: 3,
    minHeight: 4,
    opacity: 0.7,
  },
  chartBarPeak: {
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartLabelText: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    fontVariant: ['tabular-nums'],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Top clients
  topCard: {
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  topRowDivider: {
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  topRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: NEUTRAL.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },
  topMeta: { flex: 1, minWidth: 0 },
  topName: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
  },
  topSub: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
  },
  topAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    fontVariant: ['tabular-nums'],
  },

  // Empty
  emptyBlock: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  emptyIconWrap: {
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
    fontWeight: '700',
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

  // Sticky download bar
  bottomBarSafe: {
    backgroundColor: NEUTRAL.surface,
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.borderSoft,
  },
  bottomBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 4,
  },
  downloadBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadBtnDisabled: {
    opacity: 0.65,
  },
  downloadBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  refreshHint: {
    fontSize: 11,
    color: NEUTRAL.inkSoft,
    textAlign: 'center',
  },

  // iOS picker modal
  iosPickerRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 18, 17, 0.5)',
  },
  iosPickerSheet: {
    backgroundColor: NEUTRAL.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: NEUTRAL.borderSoft,
  },
  iosPickerCancel: {
    fontSize: 14,
    color: NEUTRAL.inkMid,
    fontWeight: '500',
  },
  iosPickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
  },
  iosPickerDone: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
