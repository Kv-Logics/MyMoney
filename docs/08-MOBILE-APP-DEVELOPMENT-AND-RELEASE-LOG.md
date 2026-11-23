# MyMoney Mobile App — Complete Project Context & Release Log

This document summarizes the full context, technical implementations, architecture decisions, and release history for the **MyMoney** Android native application and web platform.

---

## 1. Executive Summary & Core Milestones

Throughout this development cycle, the MyMoney platform was modernized from a web application into a production-grade native Android app (distributed via GitHub Releases and built for future Google Play Store readiness). Key achievements include:

1. **Dashboard & Mobile Experience Redesign**: Day-wise weekly spending trends, separated profit tracking, dynamic category donut breakdown, and a universal 3-in-1 Quick Action menu.
2. **Authentic ChatGPT Integration**: Direct inter-app communication launching the official OpenAI native Android application (`com.openai.chatgpt`).
3. **Ultra-HD SaaS Branding**: 2048×2048 master supersampled asset generator, true-spec adaptive icon foregrounds, and pixel-perfect native vector splash screen.
4. **Automated Over-The-Air (OTA) Updates**: In-app GitHub release update detection, dynamic semver comparison, and one-tap APK installation.
5. **Strict Security & Play Protect Hardening**: Removed all high-risk permissions, extracted keystore secrets, eliminated cleartext traffic, and addressed Play Protect false-positive heuristics.
6. **Edge-to-Edge System Bars Alignment**: Resolved Android 14/15 status bar overlap using native `WindowInsets` padding.

---

## 2. Mobile Dashboard & Component Architecture

### A. Weekly Day-Wise Spending Trends
* **Component**: `src/components/Dashboard.jsx`
* **Features**:
  * 7-day bar chart showing daily expense distribution for the current week.
  * Week navigation controls (`<` Previous Week, Next Week `>`).
  * Summary cards for monthly daily average (`Month Avg / Day`) and peak spending day (`Highest Day`).
  * Dedicated profit tracker removed from the main dashboard to maintain a clean financial overview, accessible via its own dedicated tab.

### B. Category Breakdown Donut Chart
* Dynamic SVG donut chart with interactive hover/active states.
* Central display of total spent (`Total Spent`) and total active spending categories.
* Visual category legend showing absolute amounts and percentages.

### C. Universal Floating Action (`+`) Menu
* Positioned prominently on mobile header.
* Triggers `QuickActionModal.jsx` offering three unified choices:
  1. **Add Expense** (opens `ExpenseModal.jsx`)
  2. **Daily Profit** (opens `ProfitModal.jsx`)
  3. **Pocket Money** (opens `PocketMoneyModal.jsx`)

---

## 3. Official ChatGPT Native App Integration

### A. Inter-App Communication Setup
* Replaced standard web redirection (`window.open('https://chatgpt.com')`) with direct deep linking to the **native OpenAI Android app**.
* Plugin: `@capacitor/app-launcher`
* Package: `com.openai.chatgpt`
* Scheme: `chatgpt://`

### B. Manifest Declarations (`AndroidManifest.xml`)
Declared Android 11+ package visibility queries to allow the app to query and launch the ChatGPT app directly:
```xml
<queries>
    <package android:name="com.openai.chatgpt" />
    <intent>
        <action android:name="android.intent.action.VIEW" />
        <data android:scheme="chatgpt" />
    </intent>
    <intent>
        <action android:name="android.intent.action.VIEW" />
        <data android:scheme="https" android:host="chatgpt.com" />
    </intent>
</queries>
```

### C. Launch Logic (`MobileBottomNav.jsx`)
```javascript
const handleOpenChatGPT = async () => {
  try {
    const canOpen = await AppLauncher.canOpenUrl({ url: 'com.openai.chatgpt' });
    if (canOpen?.value) {
      await AppLauncher.openUrl({ url: 'com.openai.chatgpt' });
      return;
    }
  } catch (err) {}
  
  try {
    await AppLauncher.openUrl({ url: 'chatgpt://' });
    return;
  } catch (err) {}

  // Fallback to web if ChatGPT app is not installed
  window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
};
```

---

## 4. Cold-Start Splash Screen & Graphic Assets

### A. Root Cause of Splash Screen Distortion
On Android 7.0+ (API 24+), Android resolved `@drawable/splash` to `drawable-v24/splash.png`, which was an 800×480 landscape bitmap. When displayed on 1080×2400 portrait displays, the bitmap was stretched full-screen, causing severe blur and distortion.

### B. The Modern Vector Layer-List Solution
1. Deleted the distorted landscape bitmap from `drawable-v24/splash.png`.
2. Created a clean 512×512 logo asset: `drawable/splash_icon.png`.
3. Created an un-stretched Android `<layer-list>` at `drawable/splash.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <layer-list xmlns:android="http://schemas.android.com/apk/res/android">
       <item android:drawable="@color/splash_background" />
       <item
           android:width="150dp"
           android:height="150dp"
           android:gravity="center">
           <bitmap
               android:gravity="center"
               android:src="@drawable/splash_icon" />
       </item>
   </layer-list>
   ```
4. Configured AndroidX `Theme.SplashScreen` in `styles.xml`:
   ```xml
   <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
       <item name="android:background">@drawable/splash</item>
       <item name="windowSplashScreenBackground">@color/splash_background</item>
       <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
       <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
   </style>
   ```
5. Set `androidScaleType: "CENTER_INSIDE"` and `backgroundColor: "#0a0f1d"` in `capacitor.config.json`.

---

## 5. Status Bar & Android 14/15 Edge-to-Edge Alignment

### A. Problem
On devices running Android 14 and 15 (Target SDK 35), edge-to-edge window enforcement causes web views to extend behind the status bar by default. This caused the top app header, hamburger menu, time, and battery indicators to overlap.

### B. Solution (`MainActivity.java`)
Implemented dynamic system window insets via `ViewCompat.setOnApplyWindowInsetsListener`:
```java
ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, windowInsets) -> {
    Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
    view.setPadding(insets.left, insets.top, insets.right, 0);
    return windowInsets;
});
```
This dynamically calculates the status bar and camera punch-hole height at runtime and pushes the app content safely below it.

---

## 6. Over-The-Air (OTA) Remote Update Architecture

### A. In-App Update Engine (`AutoUpdateChecker.jsx`)
* Automatically checks `https://api.github.com/repos/Kv-Logics/MyMoney/releases/latest` on launch and hourly.
* Compares local installed version (retrieved via `@capacitor/app` `App.getInfo()`) against remote release semver tags.
* Displays a modern luxury banner notifying users of available updates.
* Uses `AppLauncher.openUrl` directly into the system download manager to prevent in-app Chrome Custom Tab download queues (*"Download pending..."*).

### B. Mandatory Version Bumping Rule
Every release increments the version to allow existing installations to detect updates. Automated via `scripts/bump_version.py`:
- `package.json` (e.g. `1.0.3` -> `1.0.4`)
- `android/app/build.gradle` (`versionCode 4` -> `5`, `versionName "1.0.4"`)
- `AutoUpdateChecker.jsx` (`DEFAULT_FALLBACK_VERSION`)

---

## 7. Security Hardening & Play Protect Guidelines

### A. Manifest Permissions Audit
Removed all high-risk permissions to eliminate malware heuristics:
* ❌ `REQUEST_INSTALL_PACKAGES` (Removed)
* ❌ `RECORD_AUDIO` / `MODIFY_AUDIO_SETTINGS` (Removed)
* ❌ `usesCleartextTraffic="true"` (Removed)
* ✅ Only essential permissions retained:
  * `android.permission.INTERNET`
  * `android.permission.ACCESS_NETWORK_STATE`
  * `android.permission.VIBRATE`

### B. Keystore Credentials
* Moved keystore passwords from public `build.gradle` into `android/keystore.properties`.
* Added `*.keystore` and `keystore.properties` to `.gitignore`.

### C. Play Protect Appeals
* **Why the warning appears**: Google Play Protect automatically flags newly created certificates with zero installation history when downloaded from a web browser.
* **Workaround**: Tapping **"Install anyway"** installs the APK normally. Subsequent updates signed with the same key do not show the alert.
* **Permanent Free Whitelist**: Developers can submit the APK URL and package name `com.kvlogics.mymoney` to the official, free [Google Play Protect Appeal Form](https://support.google.com/googleplay/android-developer/contact/protectappeals).

---

## 8. Release History & Version Matrix

| Version | Version Code | Date | Primary Highlights |
| :--- | :---: | :---: | :--- |
| **v1.0.0** | `1` | Nov 2026 | Initial native Capacitor Android application release. |
| **v1.0.1** | `2` | Nov 2026 | Executive luxury dashboard, day-wise spending trend, authentic ChatGPT logo, 3-in-1 quick actions, and GitHub auto-update. |
| **v1.0.2** | `3` | Nov 2026 | Security hardening, keystore extraction, cleartext removal, 2048px master adaptive icons, SDK 35/36 configuration. |
| **v1.0.3** | `4` | Nov 2026 | Direct native ChatGPT Android app launching, razor-sharp vector layer-list splash screen. |
| **v1.0.4** | `5` | Nov 2026 | Fixed Android 15 edge-to-edge status bar & battery overlap via native `WindowInsets`, optimized download handoff. |

---

## 9. Developer Quick Reference Commands

### Bump Version & Build Release:
```bash
# 1. Bump version
python3 scripts/bump_version.py patch

# 2. Build web assets & sync Android
npm run build && npx cap sync android

# 3. Compile signed release APK
cd android && JAVA_HOME=/home/kv/jdk-21 ANDROID_HOME=/home/kv/Android/Sdk ./gradlew assembleRelease

# 4. Copy to release directory
cp android/app/build/outputs/apk/release/app-release.apk release/MyMoney-v<VERSION>.apk

# 5. Push and create GitHub Release
git add -A && git commit -m "release: v<VERSION>" && git push origin main
gh release create v<VERSION> release/MyMoney-v<VERSION>.apk --title "MyMoney Mobile App v<VERSION>" --notes "Release notes..."
```

### Install Directly to Connected Phone over ADB:
```bash
adb install -r release/MyMoney-v1.0.4.apk
adb shell am start -n com.kvlogics.mymoney/.MainActivity
```
