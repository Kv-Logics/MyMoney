import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

export async function initCapacitor({ theme, onBackPress }) {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    const { App } = await import('@capacitor/app');

    // 1. Hide splash screen smoothly
    await SplashScreen.hide();

    // 2. Set Status Bar matching theme
    const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');
    try {
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light
      });
      await StatusBar.setBackgroundColor({
        color: isDark ? '#020617' : '#ffffff'
      });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (sbErr) {
      console.warn('Status bar styling error:', sbErr);
    }

    // 3. Hardware Back button handling
    App.removeAllListeners();
    App.addListener('backButton', ({ canGoBack }) => {
      if (onBackPress && typeof onBackPress === 'function') {
        const handled = onBackPress();
        if (handled) return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (err) {
    console.warn('Capacitor native initialization note:', err);
  }
}

export async function updateNativeStatusBar(theme) {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light
    });
    await StatusBar.setBackgroundColor({
      color: isDark ? '#020617' : '#ffffff'
    });
  } catch (err) {
    console.warn('Status bar update note:', err);
  }
}

