import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const LAST_UPDATED = '15 Avril 2026';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={COLORS.darkGray} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politique de confidentialité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updatedDate}>Dernière mise à jour : {LAST_UPDATED}</Text>

        <Section title="1. Introduction">
          <Paragraph>
            Credit Africa Invest (« CREA INVEST ») s'engage à protéger la vie privée de ses utilisateurs. La présente politique de confidentialité décrit comment nous collectons, utilisons et protégeons vos données personnelles dans le cadre de l'application mobile CREA Collections.
          </Paragraph>
          <Paragraph>
            En utilisant notre application, vous acceptez les pratiques décrites dans cette politique. Nous vous encourageons à la lire attentivement.
          </Paragraph>
        </Section>

        <Section title="2. Données collectées">
          <Paragraph>Nous collectons les catégories de données suivantes :</Paragraph>
          <BulletItem>
            <Text style={styles.bulletBold}>Informations d'identification</Text> : nom, prénom, adresse email, numéro de téléphone.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bulletBold}>Données de localisation</Text> : position GPS lors des opérations de collecte, conformément aux permissions accordées.
          </BulletItem>
          <BulletItem>
            <Text style={styles.bulletBold}>Données financières</Text> : historique des transactions, soldes clients, informations Mobile Money (opérateur, numéro).
          </BulletItem>
          <BulletItem>
            <Text style={styles.bulletBold}>Données d'utilisation</Text> : logs de connexion, actions effectuées dans l'application, données techniques (modèle d'appareil, version OS).
          </BulletItem>
        </Section>

        <Section title="3. Utilisation des données">
          <Paragraph>Vos données sont utilisées exclusivement pour :</Paragraph>
          <BulletItem>L'authentification et la sécurisation de votre compte.</BulletItem>
          <BulletItem>L'exécution des opérations de collecte, dépôt et retrait.</BulletItem>
          <BulletItem>La vérification géographique des opérations dans les zones autorisées.</BulletItem>
          <BulletItem>L'envoi de notifications SMS liées à vos transactions.</BulletItem>
          <BulletItem>La conformité réglementaire (COBAC, lois camerounaises en vigueur).</BulletItem>
          <BulletItem>L'amélioration de nos services et la prévention de la fraude.</BulletItem>
        </Section>

        <Section title="4. Partage des données">
          <Paragraph>
            Vos données personnelles ne sont pas vendues ni louées à des tiers. Elles peuvent être partagées uniquement dans les cas suivants :
          </Paragraph>
          <BulletItem>
            Avec les autorités de régulation (COBAC, BEAC) dans le cadre des obligations légales.
          </BulletItem>
          <BulletItem>
            Avec les opérateurs Mobile Money (Orange Money, MTN Money) pour l'exécution des virements autorisés.
          </BulletItem>
          <BulletItem>
            Avec nos prestataires techniques sous contrat de confidentialité stricte.
          </BulletItem>
        </Section>

        <Section title="5. Sécurité des données">
          <Paragraph>
            Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
          </Paragraph>
          <BulletItem>Chiffrement des mots de passe (bcrypt) et des tokens d'authentification.</BulletItem>
          <BulletItem>Stockage sécurisé des tokens sur votre appareil (Secure Enclave / Keystore).</BulletItem>
          <BulletItem>Connexions HTTPS chiffrées pour toutes les communications.</BulletItem>
          <BulletItem>Accès aux données strictement limité aux agents autorisés.</BulletItem>
          <BulletItem>Journalisation et audit régulier des accès.</BulletItem>
        </Section>

        <Section title="6. Durée de conservation">
          <Paragraph>
            Vos données sont conservées pendant la durée de votre relation contractuelle avec CREA INVEST, augmentée des délais légaux applicables (5 ans pour les données financières conformément à la réglementation CEMAC).
          </Paragraph>
        </Section>

        <Section title="7. Vos droits">
          <Paragraph>
            Conformément à la réglementation applicable, vous disposez des droits suivants :
          </Paragraph>
          <BulletItem><Text style={styles.bulletBold}>Droit d'accès</Text> : consulter les données nous vous concernant.</BulletItem>
          <BulletItem><Text style={styles.bulletBold}>Droit de rectification</Text> : corriger des données inexactes.</BulletItem>
          <BulletItem><Text style={styles.bulletBold}>Droit à l'effacement</Text> : demander la suppression dans les limites légales.</BulletItem>
          <BulletItem><Text style={styles.bulletBold}>Droit d'opposition</Text> : vous opposer à certains traitements.</BulletItem>
        </Section>

        <Section title="8. Contact">
          <Paragraph>
            Pour toute question relative à la présente politique ou pour exercer vos droits, contactez notre délégué à la protection des données :
          </Paragraph>
          <View style={styles.contactBox}>
            <ContactLine icon="mail-outline" text="dpo@creainvest.com" />
            <ContactLine icon="call-outline" text="+237 600 000 000" />
            <ContactLine icon="location-outline" text="Rue des Palmiers, Bonapriso, Douala" />
          </View>
        </Section>

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gray} />
          <Text style={styles.footerNoteText}>
            CREA INVEST — Microfinance agréée au Cameroun. Toutes vos données sont traitées dans le respect des lois en vigueur.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrapper}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={paragraphStyles.text}>{children}</Text>;
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <View style={bulletStyles.row}>
      <View style={bulletStyles.dot} />
      <Text style={bulletStyles.text}>{children}</Text>
    </View>
  );
}

function ContactLine({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={contactStyles.row}>
      <Ionicons name={icon} size={15} color={COLORS.primary} />
      <Text style={contactStyles.text}>{text}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.lg },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 10,
  },
});
const paragraphStyles = StyleSheet.create({
  text: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 22,
    marginBottom: 8,
  },
});
const bulletStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  text: { flex: 1, fontSize: 14, color: COLORS.gray, lineHeight: 22 },
});
const contactStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  text: { fontSize: 14, color: COLORS.darkGray },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.darkGray,
    textAlign: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  updatedDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },

  bulletBold: { fontWeight: '700', color: COLORS.darkGray },

  contactBox: {
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: 6,
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
