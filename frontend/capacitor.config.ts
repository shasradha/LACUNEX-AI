import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lacunex.ai',
  appName: 'Lacunex AI',
  webDir: 'out',
  server: {
    // CRITICAL: Use HTTPS scheme so Android WebView allows requests
    // to external HTTPS APIs (like Render) without mixed-content blocking
    androidScheme: 'https',
    // Allow navigation to any URL (needed for OAuth, external links)
    allowNavigation: ['*'],
  },
  plugins: {
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
