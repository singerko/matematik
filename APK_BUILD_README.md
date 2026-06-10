# Matematik - Android APK Build Instructions

The Android configuration for "Matematik" has been successfully set up using Capacitor.
You can build the APK on your own machine using the following steps, or use the pre-built `Matematik.apk` in the project root.

## Option 1: Build with Docker/Podman (Recommended)

## Prerequisites
- Node.js installed
- Android Studio (for local build) OR Docker/Podman (for container build)

## Option 1: Build with Docker/Podman (Recommended)
Run the following command in the project directory:

```bash
# This downloads a large Android SDK image (~2GB+)
podman run --rm -v "$(pwd):/project" -w "/project/android" mingc/android-build-box bash -c "./gradlew assembleDebug"
```

The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Option 2: Build with Android Studio
1. Open the `android/` folder in Android Studio.
2. Allow it to sync Gradle.
3. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Locate the APK in the output folder.

## Project Status
- Web Assets: Built in `dist/`
- Capacitor Config: `capacitor.config.ts` created
- Android Platform: Added in `android/` folder
- Icon: Configured
