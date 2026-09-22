import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import { DecorBg } from '../../components/ui/DecorBg';
import { COLORS, NEUTRAL, SPACING, BORDER_RADIUS } from '../../constants/theme';

const roleLabel = (role?: string) =>
  role === 'COLLECTOR'
    ? 'Collecteur'
    : role === 'SUPERVISOR'
      ? 'Superviseur'
      : role === 'ADMIN'
        ? 'Administrateur'
        : 'Membre';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
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
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={NEUTRAL.ink} />
          </TouchableOpacity>
          <View style={styles.topBarMeta}>
            <Text style={styles.topBarOver}>Mon espace</Text>
            <Text style={styles.topBarTitle}>Profil & paramètres</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        {/* Hero */}
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
        </View>

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

        <Text style={styles.sectionTitle}>Paramètres</Text>
        <View style={styles.cardList}>
          <SettingsRow
            icon="lock-closed"
            label="Sécurité"
            sub="Mot de passe et authentification"
            onPress={() =>
              Alert.alert('Bientôt disponible', 'La gestion de la sécurité arrive prochainement.')
            }
            isFirst
          />
          <SettingsRow
            icon="notifications"
            label="Notifications"
            sub="Alertes superviseur"
            onPress={() =>
              Alert.alert('Bientôt disponible', 'Les paramètres de notification arrivent prochainement.')
            }
          />
          <SettingsRow
            icon="globe-outline"
            label="Langue"
            sub="Français"
            onPress={() =>
              Alert.alert('Bientôt disponible', 'Le multilingue arrive prochainement.')
            }
          />
          <SettingsRow
            icon="help-circle"
            label="Aide & support"
            sub="Centre d'assistance Crea Invest"
            onPress={() =>
              Alert.alert('Support', 'Contactez votre administrateur pour toute assistance.')
            }
          />
          <SettingsRow
            icon="document"
            label="Conditions & confidentialité"
            sub="Mentions légales"
            onPress={() => router.push('/(auth)/terms')}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEUTRAL.ink,
    marginBottom: 10,
    marginTop: SPACING.sm,
    letterSpacing: 0.1,
  },
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
