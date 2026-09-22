#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = '8189';
const API_PORT = '8000';
const ENV_FILE = path.resolve(__dirname, '..', '.env');

function detectLanIp() {
  const interfaces = os.networkInterfaces();
  const priority = ['en0', 'en1', 'en2', 'en3', 'eth0', 'wlan0'];
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const addr of interfaces[name] || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({ name, address: addr.address });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const ai = priority.indexOf(a.name);
    const bi = priority.indexOf(b.name);
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
    env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: iface.address },
  }
);

child.on('exit', (code) => process.exit(code ?? 0));
