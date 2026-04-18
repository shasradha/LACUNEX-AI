/**
 * Capacitor Native Hooks for Lacunex AI Android App
 * All plugin access is lazy-loaded to avoid SSR/build failures on web.
 */

let _capacitorCore = null;
let _plugins = {};

function getCapacitor() {
  if (_capacitorCore) return _capacitorCore;
  try {
    _capacitorCore = require('@capacitor/core');
  } catch {
    _capacitorCore = { Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } };
  }
  return _capacitorCore;
}

function getPlugin(name) {
  if (_plugins[name]) return _plugins[name];
  try {
    _plugins[name] = require(name);
  } catch {
    _plugins[name] = null;
  }
  return _plugins[name];
}

// --- Platform Detection ---

export const isNative = () => {
  try { return getCapacitor().Capacitor.isNativePlatform(); } catch { return false; }
};

export const isAndroid = () => {
  try { return getCapacitor().Capacitor.getPlatform() === 'android'; } catch { return false; }
};

export const runIfNative = async (callback) => {
  if (isNative()) {
    return await callback();
  }
};

// --- Splash Screen ---

export const hideSplashScreen = async () => {
  await runIfNative(async () => {
    try {
      const mod = getPlugin('@capacitor/splash-screen');
      if (mod?.SplashScreen) await mod.SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (e) { console.warn('Splash hide failed:', e); }
  });
};

// --- Keyboard Handling ---

export const configureKeyboard = async () => {
  await runIfNative(async () => {
    try {
      const mod = getPlugin('@capacitor/keyboard');
      if (mod?.Keyboard) {
        await mod.Keyboard.setResizeMode({ mode: 'native' });
        await mod.Keyboard.setScroll({ isDisabled: false });
      }
    } catch (e) { console.warn('Keyboard config failed:', e); }
  });
};

export const onKeyboardShow = (callback) => {
  if (!isNative()) return () => {};
  try {
    const mod = getPlugin('@capacitor/keyboard');
    if (!mod?.Keyboard) return () => {};
    const promise = mod.Keyboard.addListener('keyboardWillShow', (info) => {
      callback(info.keyboardHeight);
    });
    return () => { promise.then(l => l.remove()).catch(() => {}); };
  } catch { return () => {}; }
};

export const onKeyboardHide = (callback) => {
  if (!isNative()) return () => {};
  try {
    const mod = getPlugin('@capacitor/keyboard');
    if (!mod?.Keyboard) return () => {};
    const promise = mod.Keyboard.addListener('keyboardWillHide', () => {
      callback();
    });
    return () => { promise.then(l => l.remove()).catch(() => {}); };
  } catch { return () => {}; }
};

// --- Haptic Feedback ---

export const hapticLight = async () => {
  await runIfNative(async () => {
    try {
      const mod = getPlugin('@capacitor/haptics');
      if (mod?.Haptics) await mod.Haptics.impact({ style: mod.ImpactStyle?.Light || 'LIGHT' });
    } catch { /* silent */ }
  });
};

export const hapticMedium = async () => {
  await runIfNative(async () => {
    try {
      const mod = getPlugin('@capacitor/haptics');
      if (mod?.Haptics) await mod.Haptics.impact({ style: mod.ImpactStyle?.Medium || 'MEDIUM' });
    } catch { /* silent */ }
  });
};

export const hapticSuccess = async () => {
  await runIfNative(async () => {
    try {
      const mod = getPlugin('@capacitor/haptics');
      if (mod?.Haptics) await mod.Haptics.notification({ type: mod.NotificationType?.Success || 'SUCCESS' });
    } catch { /* silent */ }
  });
};

// --- Back Button ---

export const registerBackButton = (handler) => {
  if (!isNative()) return () => {};
  try {
    const mod = getPlugin('@capacitor/app');
    if (!mod?.App) return () => {};
    const promise = mod.App.addListener('backButton', ({ canGoBack }) => {
      handler(canGoBack);
    });
    return () => { promise.then(l => l.remove()).catch(() => {}); };
  } catch { return () => {}; }
};

// --- App Lifecycle ---

export const onAppStateChange = (callback) => {
  if (!isNative()) return () => {};
  try {
    const mod = getPlugin('@capacitor/app');
    if (!mod?.App) return () => {};
    const promise = mod.App.addListener('appStateChange', ({ isActive }) => {
      callback(isActive);
    });
    return () => { promise.then(l => l.remove()).catch(() => {}); };
  } catch { return () => {}; }
};

// --- Status Bar ---

export const configureStatusBar = async () => {
  await runIfNative(async () => {
    try {
      const mod = getPlugin('@capacitor/status-bar');
      if (mod?.StatusBar) {
        await mod.StatusBar.setStyle({ style: mod.Style?.Dark || 'DARK' });
        await mod.StatusBar.setBackgroundColor({ color: '#050A14' });
        await mod.StatusBar.setOverlaysWebView({ overlay: true });
      }
    } catch (e) { console.warn('StatusBar config failed:', e); }
  });
};

// --- Clipboard ---

export const copyToClipboard = async (text) => {
  if (isNative()) {
    try {
      const mod = getPlugin('@capacitor/clipboard');
      if (mod?.Clipboard) { await mod.Clipboard.write({ string: text }); return true; }
    } catch { /* fallback */ }
  }
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

// --- Share ---

export const shareContent = async ({ title, text, url }) => {
  if (isNative()) {
    try {
      const mod = getPlugin('@capacitor/share');
      if (mod?.Share) { await mod.Share.share({ title, text, url }); return true; }
    } catch { /* fallback */ }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ title, text, url }); return true; } catch { return false; }
  }
  return false;
};

// --- Network ---

export const getNetworkStatus = async () => {
  if (isNative()) {
    try {
      const mod = getPlugin('@capacitor/network');
      if (mod?.Network) return await mod.Network.getStatus();
    } catch { /* fallback */ }
  }
  return { connected: typeof navigator !== 'undefined' ? navigator.onLine : true, connectionType: 'unknown' };
};

export const onNetworkChange = (callback) => {
  if (isNative()) {
    try {
      const mod = getPlugin('@capacitor/network');
      if (mod?.Network) {
        const promise = mod.Network.addListener('networkStatusChange', callback);
        return () => { promise.then(l => l.remove()).catch(() => {}); };
      }
    } catch { /* fallback */ }
  }
  if (typeof window === 'undefined') return () => {};
  const on = () => callback({ connected: true });
  const off = () => callback({ connected: false });
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
};

// --- Initialize All Native Features ---

export const initializeNativeApp = async () => {
  if (!isNative()) return;
  await configureStatusBar();
  await configureKeyboard();
  setTimeout(() => { hideSplashScreen(); }, 500);

  // CRITICAL FIX: Intercept ALL external links to open in the system browser 
  // instead of hijacking the Capacitor WebView.
  if (typeof document !== 'undefined') {
    document.addEventListener('click', async (e) => {
      let target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentNode;
      }
      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href');
        const targetAttr = target.getAttribute('target');
        // If it's an external link or target=_blank
        if (href && (href.startsWith('http') || targetAttr === '_blank') && !href.includes(window.location.host)) {
          e.preventDefault();
          try {
            const mod = getPlugin('@capacitor/browser');
            if (mod?.Browser) {
              await mod.Browser.open({ url: href });
            } else {
              // Fallback to Capacitor system intent
              const appMod = getPlugin('@capacitor/app');
              if (appMod?.App) {
                await appMod.App.openUrl({ url: href });
              } else {
                window.open(href, '_system');
              }
            }
          } catch (err) {
            window.open(href, '_system');
          }
        }
      }
    });
  }
};
