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

const iface = detectLanIp();
if (!iface) {
  console.error('Could not detect a LAN IP. Are you connected to Wi-Fi or Ethernet?');
  process.exit(1);
}

console.log(`Using ${iface.name} -> ${iface.address}`);
updateEnvFile(iface.address);

const extraArgs = process.argv.slice(2);
const child = spawn(
  'npx',
  ['expo', 'start', '--port', PORT, '--offline', ...extraArgs],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: iface.address },
  }
);

child.on('exit', (code) => process.exit(code ?? 0));
