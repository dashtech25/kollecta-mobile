export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "CM" */
  code: string;
  /** Localized country name (French) */
  name: string;
  /** Dial code prefix including the leading + sign, e.g. "+237" */
  dialCode: string;
  /** Unicode regional-indicator flag emoji */
  flag: string;
}

/**
 * Country list for phone number entry. Curated for the CREA Collections
 * customer base — primarily CEMAC + neighbors + the Francophone diaspora.
 * Keep this list short enough to scroll quickly, long enough to serve every
 * realistic client.
 */
export const COUNTRIES: readonly Country[] = [
  // CEMAC + Cameroon
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩' },
  { code: 'CF', name: 'République centrafricaine', dialCode: '+236', flag: '🇨🇫' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'République démocratique du Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { code: 'GQ', name: 'Guinée équatoriale', dialCode: '+240', flag: '🇬🇶' },

  // Other Francophone West/Central Africa
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳' },
  { code: 'MR', name: 'Mauritanie', dialCode: '+222', flag: '🇲🇷' },

  // Anglophone neighbors
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'LR', name: 'Liberia', dialCode: '+231', flag: '🇱🇷' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },

  // East / Southern Africa
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzanie', dialCode: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Ouganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'ET', name: 'Éthiopie', dialCode: '+251', flag: '🇪🇹' },
  { code: 'ZA', name: 'Afrique du Sud', dialCode: '+27', flag: '🇿🇦' },

  // North Africa
  { code: 'MA', name: 'Maroc', dialCode: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', dialCode: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', dialCode: '+216', flag: '🇹🇳' },
  { code: 'EG', name: 'Égypte', dialCode: '+20', flag: '🇪🇬' },

  // Diaspora hubs
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸' },
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'CN', name: 'Chine', dialCode: '+86', flag: '🇨🇳' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Cameroun

/**
 * Find the country matching the longest dial-code prefix of the given
 * international number (e.g. "+237690000000" → Cameroun).
 * Returns null when no known country matches.
 */
export function findCountryByDialCode(value: string): Country | null {
  if (!value) return null;
  // Sort by dialCode length DESC so longer prefixes (e.g. "+1242") match
  // before shorter ones (e.g. "+1").
  const byLength = [...COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );
  return byLength.find((c) => value.startsWith(c.dialCode)) ?? null;
}
