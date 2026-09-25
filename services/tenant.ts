import * as SecureStore from './secure-storage';

const TENANT_DOMAIN_KEY = 'tenantDomain';
const TENANT_BRANDING_KEY = 'tenantBranding';

export interface TenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export async function getTenantDomain(): Promise<string | null> {
  return SecureStore.getItemAsync(TENANT_DOMAIN_KEY);
}

export async function setTenantDomain(domain: string): Promise<void> {
  await SecureStore.setItemAsync(TENANT_DOMAIN_KEY, domain);
}

export async function clearTenantDomain(): Promise<void> {
  await SecureStore.deleteItemAsync(TENANT_DOMAIN_KEY);
  await SecureStore.deleteItemAsync(TENANT_BRANDING_KEY);
}

export async function getTenantBranding(): Promise<TenantBranding | null> {
  const raw = await SecureStore.getItemAsync(TENANT_BRANDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TenantBranding;
  } catch {
    return null;
  }
}

export async function setTenantBranding(branding: TenantBranding): Promise<void> {
  await SecureStore.setItemAsync(TENANT_BRANDING_KEY, JSON.stringify(branding));
}
