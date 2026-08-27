# GymFlow — Android shell (Capacitor)

Packages the existing PWA as a sideloadable Android app. **The web app is not
changed by any of this**: it stays a build-step-free set of ES modules served
from any static host, and everything Capacitor needs lives in this directory.

## What is tracked vs generated

| Path | Tracked? | What it is |
|---|---|---|
| `native/package.json` | yes | Capacitor dependencies and build scripts |
| `native/sync-web.mjs` | yes | Copies the web app into `www/` |
| `native/capacitor.config.json` | yes | App id, name, splash config |
| `native/www/` | no | Generated copy of the web app |
| `native/android/` | no | Generated Android Studio project |
| `native/node_modules/` | no | Dependencies |

`native/www/` and `native/android/` are rebuilt from source by the commands
below, so nothing is lost by deleting them.

## Prerequisites

- Node.js 18+
- Android Studio (for the SDK and, if you want it, the emulator)
- JDK 17 — Android Gradle Plugin 8.x requires it

Set `ANDROID_HOME`, or open the generated project in Android Studio once and it
will configure the SDK path for you.

## First build

```bash
cd native
npm install
npm run add:android      # copies the web app, then generates native/android/
npm run open:android     # opens the project in Android Studio
```

From Android Studio, **Run** on a device or emulator.

For a command-line debug APK instead:

```bash
npm run build:debug
# native/android/app/build/outputs/apk/debug/app-debug.apk
```

## After changing the web app

The APK bundles a *copy* of the web app, so re-sync before rebuilding:

```bash
cd native
npm run sync
```

## Release build

1. Generate a keystore (once):

   ```bash
   keytool -genkey -v -keystore gymflow-release.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias gymflow
   ```

   Keep this file and its passwords out of the repository. Losing the keystore
   means you can never update an already-installed app in place.

2. Create `native/android/keystore.properties` (gitignored along with the rest
   of `native/android/`):

   ```properties
   storeFile=../../gymflow-release.jks
   storePassword=…
   keyAlias=gymflow
   keyPassword=…
   ```

3. Wire it into `native/android/app/build.gradle` under `signingConfigs`, then:

   ```bash
   npm run build:release
   ```

For sideloading, distribute the APK directly. For the Play Store, build an AAB
(`gradlew.bat bundleRelease`) instead.

## Notes and caveats

- **Service worker is disabled in the native build.** Capacitor already serves
  assets locally; a second cache layer only risks serving stale files, and it is
  much harder for a member to clear inside an app than in a browser.
  `sync-web.mjs` replaces `sw.js` with a stub that clears any existing caches.
- **Firebase works unchanged.** `androidScheme: "https"` means the WebView runs
  on an `https://` origin, which Firebase Auth requires. If you enable Google
  sign-in later, add the app's SHA-1 to the Firebase console.
- **App id** is `com.gymflow.app`. Change it in `native/capacitor.config.json` *before*
  the first `add:android`; changing it afterwards means regenerating the
  platform directory.
- **Verified as far as the toolchain allows.** `npm install` and
  `npx cap add android` were both run successfully here: the Android project
  generates, all three plugins register, and the full web bundle (including the
  1 MB exercise library) lands in `android/app/src/main/assets/public`.
  Compiling an actual APK needs the Android SDK and JDK 17, which are not
  installed in the environment where this was set up — so `gradlew assembleDebug`
  is the one step that has not been executed. Expect the usual first-run Gradle
  SDK prompts.
