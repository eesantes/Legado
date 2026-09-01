---
name: Android build delivery
description: Scope of Android packaging available in this Expo workspace.
---

The workspace's Expo publishing flow provides the mobile preview and static Expo Go build, but does not directly produce or publish a Google Play APK.

**Why:** The user requested an APK, and the available build script only packages Expo Go bundles; no Android Gradle project or Android toolchain is present.

**How to apply:** Build and verify the Expo app here, then use an external Android-capable build service or local Android toolchain for the final APK.