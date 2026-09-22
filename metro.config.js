// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix Metro file watcher on Windows (avoids "Failed to start watch mode")
config.watcher = {
  ...config.watcher,
  watchman: {
    deferStates: [],
  },
  // Fall back to fs.watch with polling when watchman is unavailable
  healthCheck: {
    enabled: false,
  },
};

module.exports = config;
