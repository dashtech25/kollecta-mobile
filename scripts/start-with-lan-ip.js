#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = '8189';
const API_PORT = '3011';
// .env.local, jamais .env : Expo charge .env.local en priorité sur .env
// (et il est gitignored par défaut), donc l'IP locale ne touche jamais la
// config versionnée.
const ENV_FILE = path.resolve(__dirname, '..', '.env.local');

function detectLanIp() {
  const interfaces = os.networkInterfaces();
  const priority = ['en0', 'en1', 'en2', 'en3', 'eth0', 'wlan0', 'wi-fi', 'ethernet'];
  const virtualPattern = /vethernet|virtualbox|vmware|hyper-v|docker|wsl|loopback/i;
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const addr of interfaces[name] || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({ name, address: addr.address, virtual: virtualPattern.test(name) });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.virtual !== b.virtual) return a.virtual ? 1 : -1;
    const ai = priority.indexOf(a.name.toLowerCase());
    const bi = priority.indexOf(b.name.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return candidates[0];
}

function updateEnvFile(ip) {
  const newLine = `EXPO_PUBLIC_API_URL=http://${ip}:${API_PORT}/api`;
  let contents = '';

  if (fs.existsSync(ENV_FILE)) {
    contents = fs.readFileSync(ENV_FILE, 'utf8');
    if (contents.match(/^EXPO_PUBLIC_API_URL=.*/m)) {
      contents = contents.replace(/^EXPO_PUBLIC_API_URL=.*/m, newLine);
    } else {
      contents = contents.trimEnd() + `\n${newLine}\n`;
    }
  } else {
    contents = `${newLine}\n`;
  }

  fs.writeFileSync(ENV_FILE, contents);
}

/**
 * Lit une variable depuis process.env, sinon .env.local, sinon .env — sans
 * dépendance dotenv (pas installée dans ce projet), juste assez pour les
 * trois clés PLATFORM_ADMIN_* ci-dessous.
 */
function readEnvVar(name) {
  if (process.env[name]) return process.env[name];
  for (const file of ['.env.local', '.env']) {
    const p = path.resolve(__dirname, '..', file);
    if (!fs.existsSync(p)) continue;
    const match = fs
      .readFileSync(p, 'utf8')
      .match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

/**
 * Backend en résolution de tenant stricte (Phase 2) : le middleware rejette
 * toute requête dont le Host ne correspond à aucune organisation — y
 * compris une IP LAN qui change à chaque reconnexion Wi-Fi. Plutôt que de
 * refaire la mise à jour à la main via l'API platform-admin à chaque fois,
 * ce best-effort la fait automatiquement au démarrage.
 *
 * Nécessite PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD dans .env.local
 * (jamais commités). Sans eux, ou si le backend n'est pas encore démarré,
 * on log et on continue — ça ne doit jamais bloquer `npm start`.
 */
async function syncPlatformAdminCustomDomain(ip) {
  const email = readEnvVar('PLATFORM_ADMIN_EMAIL');
  const password = readEnvVar('PLATFORM_ADMIN_PASSWORD');
  const orgSlug = readEnvVar('PLATFORM_ADMIN_ORG_SLUG') || 'crea-invest';

  if (!email || !password) {
    console.log(
      '(PLATFORM_ADMIN_EMAIL/PLATFORM_ADMIN_PASSWORD absents de .env.local — ' +
        "customDomain non synchronisé automatiquement. Si l'app mobile ne " +
        'peut pas joindre le backend, mets à jour le customDomain de ' +
        "l'organisation à la main via /api/platform-admin.)",
    );
    return;
  }

  try {
    const loginRes = await fetch(
      `http://localhost:${API_PORT}/api/platform-admin/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!loginRes.ok) throw new Error(`login → ${loginRes.status}`);
    const { accessToken } = await loginRes.json();

    const orgsRes = await fetch(
      `http://localhost:${API_PORT}/api/platform-admin/organizations`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!orgsRes.ok) throw new Error(`organizations → ${orgsRes.status}`);
    const orgs = await orgsRes.json();
    const org = orgs.find((o) => o.slug === orgSlug);
    if (!org) throw new Error(`organisation "${orgSlug}" introuvable`);

    if (org.customDomain === ip) {
      console.log(`customDomain de "${orgSlug}" déjà à jour (${ip})`);
      return;
    }

    const patchRes = await fetch(
      `http://localhost:${API_PORT}/api/platform-admin/organizations/${org.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ customDomain: ip }),
      },
    );
    if (!patchRes.ok) throw new Error(`update → ${patchRes.status}`);

    console.log(`customDomain de "${orgSlug}" synchronisé sur ${ip}`);
  } catch (err) {
    console.log(
      `(Sync customDomain ignorée — ${err.message}. Le backend n'est ` +
        'peut-être pas encore démarré ; ce sera retenté au prochain lancement.)',
    );
  }
}

async function main() {
  const iface = detectLanIp();
  if (!iface) {
    console.error('Could not detect a LAN IP. Are you connected to Wi-Fi or Ethernet?');
    process.exit(1);
  }

  console.log(`Using ${iface.name} -> ${iface.address}`);
  updateEnvFile(iface.address);
  await syncPlatformAdminCustomDomain(iface.address);

  const extraArgs = process.argv.slice(2);
  const child = spawn(
    'npx',
    ['expo', 'start', '--port', PORT, '--offline', ...extraArgs],
    {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: iface.address },
    },
  );

  child.on('exit', (code) => process.exit(code ?? 0));
}

main();
