import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.gsp',
  appName: 'GESTIME',
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
