import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gestime.app',
  appName: 'gestime',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Http: {
      enabled: true
    }
  }
};

export default config;
