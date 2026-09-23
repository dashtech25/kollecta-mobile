import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Remplace `expo-secure-store` partout où le token doit survivre sur web
 * aussi (dev/test dans le navigateur) — le module natif de expo-secure-store
 * n'a aucune implémentation web (`ExpoSecureStore.web.ts` exporte un objet
 * vide), donc tout appel direct y plante avec "is not a function".
 *
 * Sur natif (iOS/Android), délègue tel quel au Keychain/Keystore via
 * expo-secure-store. Sur web, repli sur localStorage — moins sûr qu'un
 * stockage chiffré, mais c'est déjà l'hypothèse implicite de tout stockage
 * côté navigateur.
 */

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Stockage indisponible (navigation privée, quota) — pas de session
      // persistée, mais on ne fait pas planter le flow de login pour autant.
    }
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // Idem : silencieux, rien à faire de plus si le stockage est indisponible.
    }
    return;
  }
  return SecureStore.deleteItemAsync(key);
}
