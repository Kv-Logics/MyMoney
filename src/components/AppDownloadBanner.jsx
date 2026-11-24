import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, ExternalLink, Sparkles } from 'lucide-react';
import { isNativeApp } from '../api';

const GITHUB_REPO = 'Kv-Logics/MyMoney';
const DISMISS_KEY = 'mymoney_apk_banner_dismissed';

/**
 * Web-only banner that surfaces the latest Android APK release from GitHub
 * so visitors on the website can download the newest build. Hidden inside the
 * native Android app (which has its own in-app auto-updater).
 */
export default function AppDownloadBanner() {
  const [release, setRelease] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isNativeApp) return; // native app already has the auto-updater
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { Accept: 'application/vnd.github.v3+json' }
        });
        if (!res.ok) return;
        const data = await res.json();
        const tag = data.tag_name || '';
        const apkAsset = data.assets?.find(a => a.name?.endsWith('.apk'));
        if (cancelled || !tag) return;

        // Re-show whenever a newer version than the one dismissed is published
        const lastDismissed = localStorage.getItem(DISMISS_KEY);
        if (lastDismissed === tag) setDismissed(true);

        setRelease({
          tag,
          name: data.name || tag,
          downloadUrl: apkAsset?.browser_download_url || data.html_url,
          releaseUrl: data.html_url,
          size: apkAsset ? `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB` : null
        });
      } catch {
        /* silently skip on network/rate-limit errors */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (release?.tag) localStorage.setItem(DISMISS_KEY, release.tag);
    } catch { /* ignore */ }
  };

  if (isNativeApp || !release || dismissed) return null;

  return (
    <div className="animate-slide-in relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg shadow-emerald-900/10 border border-white/15">
      {/* decorative glow */}
      <div className="absolute -top-10 -right-6 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-extrabold tracking-tight">
                Get MyMoney for Android
              </h4>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {release.tag}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-50/90 mt-0.5">
              Install the native app for the fastest experience
              {release.size ? ` • APK ${release.size}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={release.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-shine relative overflow-hidden flex-1 sm:flex-none py-2.5 px-4 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Download APK</span>
          </a>
          <a
            href={release.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="What's new"
            className="py-2.5 px-3 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl transition hidden sm:flex items-center gap-1"
          >
            <span>Notes</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleDismiss}
            title="Dismiss"
            className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
