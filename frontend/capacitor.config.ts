import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lacunex.ai',
  appName: 'Lacunex AI',
  webDir: 'out',
  server: {
    // Use HTTPS scheme to match production API
    androidScheme: 'https',
  },
  plugins: {
    // CRITICAL: Route ALL fetch() calls through Android's native HTTP client
    // This completely bypasses WebView CORS, mixed content, and SSL issues
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#050a14",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#A855F7"
    },
    Keyboard: {
      resize: "none",
    }
  }
};

export default config;
