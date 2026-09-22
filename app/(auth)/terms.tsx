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

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={COLORS.darkGray} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updatedDate}>Dernière mise à jour : {LAST_UPDATED}</Text>

        <View style={styles.highlightBox}>
          <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
          <Text style={styles.highlightText}>
            En utilisant l'application CREA Collections, vous acceptez sans réserve les présentes conditions d'utilisation.
          </Text>
        </View>

        <Section title="1. Acceptation des conditions">
          <Paragraph>
            Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile CREA Collections, éditée par Credit Africa Invest (« CREA INVEST »), institution de microfinance de première catégorie agréée au Cameroun.
          </Paragraph>
          <Paragraph>
            L'accès à l'application est réservé aux agents employés ou mandatés par CREA INVEST. Tout accès non autorisé est strictement interdit.
          </Paragraph>
        </Section>

        <Section title="2. Description du service">
          <Paragraph>
            CREA Collections est une plateforme mobile de gestion des opérations de microfinance permettant :
          </Paragraph>
          <BulletItem>La collecte d'épargne et de dépôts auprès des clients sur le terrain.</BulletItem>
          <BulletItem>L'initiation et le suivi des demandes de retrait Mobile Money.</BulletItem>
          <BulletItem>La gestion du portefeuille clients (inscription, mise à jour).</BulletItem>
          <BulletItem>La consultation des tableaux de bord et rapports d'activité.</BulletItem>
          <BulletItem>La réconciliation périodique des comptes clients.</BulletItem>
        </Section>

        <Section title="3. Conditions d'accès">
          <Paragraph>
            L'utilisation de l'application est soumise aux conditions suivantes :
          </Paragraph>
          <BulletItem>Posséder des identifiants valides fournis par CREA INVEST.</BulletItem>
          <BulletItem>
            Ne jamais partager vos identifiants de connexion avec des tiers, y compris des collègues.
          </BulletItem>
          <BulletItem>
            Signaler immédiatement à votre superviseur toute compromission de votre compte.
          </BulletItem>
          <BulletItem>
            Utiliser l'application uniquement dans le cadre de vos missions professionnelles autorisées.
          </BulletItem>
          <BulletItem>
            Autoriser l'accès à la localisation GPS lors des opérations de terrain.
          </BulletItem>
        </Section>

        <Section title="4. Obligations de l'utilisateur">
          <Paragraph>
            En tant qu'utilisateur, vous vous engagez à :
          </Paragraph>
          <BulletItem>Effectuer uniquement des transactions réelles et légitimes pour les clients enregistrés.</BulletItem>
          <BulletItem>Renseigner des informations exactes et complètes lors de chaque opération.</BulletItem>
          <BulletItem>Respecter les zones géographiques et les limites de transaction qui vous sont assignées.</BulletItem>
          <BulletItem>Conserver la confidentialité des informations financières des clients.</BulletItem>
          <BulletItem>Ne pas tenter de contourner les mécanismes de sécurité de l'application.</BulletItem>
        </Section>

        <Section title="5. Activités interdites">
          <Paragraph>
            Il est strictement interdit d'utiliser CREA Collections pour :
          </Paragraph>
          <BulletItem>Effectuer des transactions frauduleuses ou fictives.</BulletItem>
          <BulletItem>Accéder aux données d'autres agents ou de clients non affectés.</BulletItem>
          <BulletItem>Tenter de pirater, modifier ou désassembler l'application.</BulletItem>
          <BulletItem>Toute activité contraire aux lois camerounaises applicables.</BulletItem>
          <BulletItem>Le blanchiment d'argent ou le financement d'activités illicites.</BulletItem>
        </Section>

        <Section title="6. Responsabilités">
          <Paragraph>
            CREA INVEST s'efforce d'assurer la disponibilité et la fiabilité de l'application mais ne peut garantir un service ininterrompu. En cas de défaillance technique, les transactions seront traitées dès le rétablissement du service.
          </Paragraph>
          <Paragraph>
            L'utilisateur est seul responsable des actions effectuées depuis son compte. Toute opération frauduleuse ou non conforme aux procédures internes engage la responsabilité personnelle de l'agent.
          </Paragraph>
        </Section>

        <Section title="7. Propriété intellectuelle">
          <Paragraph>
            L'ensemble des éléments de l'application CREA Collections (code source, design, marque, contenus) sont la propriété exclusive de Credit Africa Invest et sont protégés par les lois sur la propriété intellectuelle. Toute reproduction sans autorisation est interdite.
          </Paragraph>
        </Section>

        <Section title="8. Suspension et résiliation">
          <Paragraph>
            CREA INVEST se réserve le droit de suspendre ou résilier l'accès d'un utilisateur sans préavis en cas de :
          </Paragraph>
          <BulletItem>Violation des présentes CGU.</BulletItem>
          <BulletItem>Soupçon de fraude ou d'activité malveillante.</BulletItem>
          <BulletItem>Fin du contrat de travail ou de mandat avec CREA INVEST.</BulletItem>
        </Section>

        <Section title="9. Loi applicable et juridiction">
          <Paragraph>
            Les présentes CGU sont régies par le droit camerounais. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut d'accord, les tribunaux compétents de Douala, Cameroun, seront seuls compétents.
          </Paragraph>
        </Section>

        <Section title="10. Contact">
          <Paragraph>
            Pour toute question relative aux présentes conditions, contactez le département juridique :
          </Paragraph>
          <View style={styles.contactBox}>
            <ContactLine icon="mail-outline" text="legal@creainvest.com" />
            <ContactLine icon="call-outline" text="+237 600 000 000" />
            <ContactLine icon="location-outline" text="BP 12345, Douala, Cameroun" />
          </View>
        </Section>

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gray} />
          <Text style={styles.footerNoteText}>
            Ces conditions peuvent être modifiées. La version en vigueur est toujours disponible dans l'application. Votre utilisation continue vaut acceptation des modifications.
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
  title: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray, marginBottom: 10 },
});
const paragraphStyles = StyleSheet.create({
  text: { fontSize: 14, color: COLORS.gray, lineHeight: 22, marginBottom: 8 },
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
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },

  highlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff1f1',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: 10,
    marginBottom: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.darkGray,
    lineHeight: 20,
    fontWeight: '500',
  },

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
