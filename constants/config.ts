export const API_URL = process.env.EXPO_PUBLIC_API_URL
|| 'http://localhost:3011/api';

// Pré-remplissage du champ de sélection d'organisation au premier lancement
// (voir app/(auth)/select-organization.tsx) — l'utilisateur choisit son
// organisation à l'exécution, ce n'est qu'une commodité de dev, pas une
// valeur envoyée telle quelle à l'API.
export const DEFAULT_TENANT_DOMAIN_HINT = process.env.EXPO_PUBLIC_TENANT_DOMAIN || '';
