import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { DecorBg } from '../../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { API_URL } from '../../../constants/config';

const monthFr = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

type ReportKind = 'monthly-current' | 'monthly-prev' | 'yearly';

export default function SupervisorReportsScreen() {
  const [busy, setBusy] = useState<ReportKind | null>(null);

  const downloadAndShare = async (
    kind: ReportKind,
    url: string,
    filename: string,
  ) => {
    setBusy(kind);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const fileUri = (FileSystem.documentDirectory ?? '') + filename;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri);
        } else {
          Alert.alert('Téléchargé', `Fichier enregistré : ${result.uri}`);
        }
      } else {
        Alert.alert('Erreur', 'Impossible de télécharger le rapport');
      }
    } catch {
      Alert.alert('Erreur', 'Échec du téléchargement');
    } finally {
      setBusy(null);
    }
  };

  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1;
  const currentLabel = monthFr[now.getMonth()];
  const prevLabel = monthFr[prevMonthDate.getMonth()];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.iconBtn}>
            <Ionicons name="document-text" size={20} color={NEUTRAL.ink} />
          </View>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Analyse</Text>
            <Text style={styles.topBarTitle}>Rapports</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <DecorBg variant="rings" anchor="bottom-right" color="#FFFFFF" opacity={0.1} width={220} height={220} />
          <DecorBg variant="dots" anchor="top-left" color="#FFFFFF" opacity={0.06} width={120} height={80} />
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Exports & analyses</Text>
            <Text style={styles.heroTitle}>Rapports de branche</Text>
            <Text style={styles.heroSub}>
              Téléchargez vos rapports Excel — toutes les transactions, tous les
              collecteurs, format prêt à archiver.
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="download" size={48} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Disponibles</Text>
        <View style={styles.cardList}>
          <ReportCard
            icon="calendar"
            title={`${currentLabel} ${now.getFullYear()}`}
            subtitle="Mois en cours · toutes opérations"
            badge="Excel"
            isFirst
            busy={busy === 'monthly-current'}
            onPress={() =>
              downloadAndShare(
                'monthly-current',
                `${API_URL}/reports/monthly/excel?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
                `rapport-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`,
              )
            }
          />
          <ReportCard
            icon="calendar-outline"
            title={`${prevLabel} ${prevYear}`}
            subtitle="Mois précédent · toutes opérations"
            badge="Excel"
            busy={busy === 'monthly-prev'}
            onPress={() =>
              downloadAndShare(
                'monthly-prev',
                `${API_URL}/reports/monthly/excel?year=${prevYear}&month=${prevMonth}`,
                `rapport-${prevYear}-${String(prevMonth).padStart(2, '0')}.xlsx`,
              )
            }
          />
          <ReportCard
            icon="bar-chart"
            title={`Année ${now.getFullYear()}`}
            subtitle={`1er janvier → ${now.toLocaleDateString('fr-FR')}`}
            badge="Excel"
            busy={busy === 'yearly'}
            onPress={() =>
              downloadAndShare(
                'yearly',
                `${API_URL}/reports/range/excel?start=${now.getFullYear()}-01-01&end=${now.toISOString().slice(0, 10)}`,
                `rapport-annuel-${now.getFullYear()}.xlsx`,
              )
            }
          />
        </View>

        {/* Tips banner */}
        <View style={styles.tipBanner}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb-outline" size={14} color={COLORS.primary} />
          </View>
          <Text style={styles.tipText}>
            Les rapports incluent un en-tête, le détail de chaque transaction et
            une ligne de total. Ils peuvent être ouverts dans Excel, Google
            Sheets ou Numbers.
          </Text>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────── Sub-components ────────────────

function ReportCard({
  icon,
  title,
  subtitle,
  badge,
  busy,
  onPress,
  isFirst,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  badge: string;
  busy?: boolean;
  onPress: () => void;
  isFirst?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      disabled={busy}
      style={[styles.row, !isFirst && styles.rowDivider]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={NEUTRAL.ink} />
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.formatBadge}>
        <Text style={styles.formatBadgeText}>{badge}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={NEUTRAL.ink} />
      ) : (
        <Ionicons name="download-outline" size={16} color={NEUTRAL.inkSoft} />
      )}
    </TouchableOpacity>
  );
}

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
  topBarTitle: { fontSize: 17, fontWeight: '700', color: NEUTRAL.ink, marginTop: 1 },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  heroLeft: { flex: 1 },
  heroLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: NEUTRAL.inkOnFill,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 6,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  heroIconWrap: { width: 80, alignItems: 'center', justifyContent: 'center' },

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
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
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
  rowMeta: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: NEUTRAL.ink },
  rowSub: { fontSize: 11, color: NEUTRAL.inkSoft, marginTop: 2 },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#E8F5E9',
  },
  formatBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },

  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NEUTRAL.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.borderSoft,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde0e0',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: NEUTRAL.inkMid,
    lineHeight: 16,
  },
});
