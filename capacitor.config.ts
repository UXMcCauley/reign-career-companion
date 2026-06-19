import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mccauley.reigncareercompanion',
  appName: 'REIGN Career Companion',
  webDir: 'dist',
  plugins: {
    LiveUpdates: {
      appId: 'b778e185',
      channel: 'Production',
      autoUpdateMethod: 'background',
      maxVersions: 2
    }
  }
};

export default config;
