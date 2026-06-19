import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mccauley.reigncareercompanion',
  appName: 'REIGN Career Companion',
  webDir: 'dist',
  ios: {
    backgroundColor: '#070814'
  },
  plugins: {
    LiveUpdates: {
      appId: '5d236a33',
      channel: 'Production',
      autoUpdateMethod: 'background',
      maxVersions: 2
    }
  }
};

export default config;
