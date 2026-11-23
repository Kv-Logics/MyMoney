import React, { useState, useEffect } from 'react';
import { Download, Sparkles, X, ArrowUpCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const GITHUB_REPO = 'Kv-Logics/MyMoney';
export const DEFAULT_FALLBACK_VERSION = '1.0.1';

// Compare two semver strings (e.g., "1.0.2" vs "1.0.1")
function isNewerVersion(remote, local) {
  const cleanRemote = (remote || '').replace(/^v/, '').trim();
  const cleanLocal = (local || '').replace(/^v/, '').trim();
  
  const rParts = cleanRemote.split('.').map(Number);
  const lParts = cleanLocal.split('.').map(Number);
  
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

export default function AutoUpdateChecker() {
  const [currentVersion, setCurrentVersion] = useState(DEFAULT_FALLBACK_VERSION);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Load native installed app version
  useEffect(() => {
    async function loadVersion() {
      try {
        const info = await App.getInfo();
        if (info && info.version) {
          setCurrentVersion(info.version);
        }
      } catch (err) {
        // In browser web environment, default to fallback
        setCurrentVersion(DEFAULT_FALLBACK_VERSION);
      }
    }
    loadVersion();
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // Get current version first
      let localVer = currentVersion;
      try {
        const info = await App.getInfo();
        if (info?.version) localVer = info.version;
      } catch (e) {}

      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const release = await res.json();
      const tagName = release.tag_name || '';

      if (tagName && isNewerVersion(tagName, localVer)) {
        // Find APK asset in release
        const apkAsset = release.assets?.find(a => a.name?.endsWith('.apk'));
        setUpdateInfo({
          tag: tagName,
          title: release.name || tagName,
          body: release.body || '',
          downloadUrl: apkAsset?.browser_download_url || release.html_url,
          releaseUrl: release.html_url,
          apkName: apkAsset?.name || 'MyMoney-Update.apk',
          size: apkAsset ? `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB` : null,
        });
        setIsDismissed(false);
      } else {
        setUpdateInfo(null);
      }
    } catch (err) {
      console.warn('Auto update check skipped:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check after loading version
    checkForUpdates();

    // Check periodically every hour
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentVersion]);

  if (!updateInfo || isDismissed) return null;

  const handleInstall = async () => {
    setIsDownloading(true);
    try {
      // Use Capacitor Browser to trigger native Android download & Package Installer
      await Browser.open({ url: updateInfo.downloadUrl });
    } catch (err) {
      console.warn('Capacitor browser open failed, falling back to window.open:', err);
      window.open(updateInfo.downloadUrl, '_system');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 animate-slide-in">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-2xl p-4 shadow-2xl border border-white/20 backdrop-blur-xl flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <ArrowUpCircle className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold tracking-tight">New Update Ready!</h4>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/25 text-white">
                  {updateInfo.tag}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 line-clamp-1">
                Version {updateInfo.tag} is available (Current: v{currentVersion})
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleInstall}
            disabled={isDownloading}
            className="flex-1 py-2 px-3 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isDownloading ? 'Opening Download...' : `Download & Install APK ${updateInfo.size ? `(${updateInfo.size})` : ''}`}</span>
          </button>
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1"
          >
            <span>Notes</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
