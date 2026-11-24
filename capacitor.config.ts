import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blinkitops.inventory',
  appName: 'BlinkitOps',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.9:3000',
    cleartext: true,
  },
};

export default config;
