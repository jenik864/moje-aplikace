# Doomscrolling: measured time

Doomscrolling no longer awards rank for manual minutes, checkmarks, or streaks.
Rank uses the mean of the **previous seven complete local calendar days**, each with a system measurement made after that day's midnight. Missing coverage is unknown. Today's partial time is shown separately. Personal limits do not affect rank.

| Rank | Maximum measured average minutes/day |
| --- | --- |
| Copper | Default / above 180 / insufficient data |
| Bronze | 180 |
| Iron | 150 |
| Silver | 120 |
| Gold | 90 |
| Platinum | 75 |
| Sapphire | 60 |
| Amethyst | 45 |
| Ruby | 30 |
| Emerald | 20 |
| Diamond | 10 |
| Obsidian | 5 |

These are initial product thresholds, not clinical advice. PRIME keeps the best measured rank. The previous manual PRIME is archived as `legacyScrollPrime`; reasons, signature, manual logs and SOS history are preserved. Only the native measurement service writes `usageDays` through the UI. Client storage is not an anti-tampering security boundary.

## Android

`modules/quitter-usage` is a local Expo module discovered through Expo's default `./modules` native autolinking directory. It needs a custom Android build (`npx expo run:android` on a machine with Android SDK), not Expo Go. The manifest declares PACKAGE_USAGE_STATS; the user grants Usage Access in Android settings. No network or accessibility-service permission is needed.

The module queries UsageStatsManager events, clips foreground intervals to local day boundaries, and aggregates a fixed list of social application packages. It refreshes on return to the app and every minute while foregrounded. Revocation and query failures have explicit UI states. Empty system history is omitted, not a fabricated zero. Reported time is Android foreground activity time, not content/feed recognition. Browser domains, cloned apps and unsupported package variants are not covered; YouTube/Discord time includes all uses of those apps.

Native device acceptance still required: grant/deny/revoke, known 10-minute usage versus Android's dashboard, background/foreground sessions crossing midnight, screen lock, reboot, split screen, recent OS history retention, timezone change. Type checking, JS exports and autolinking discovery do not prove Kotlin compilation or device accuracy.

## iOS / Expo Go / web

There is **no iOS measurement implementation in this update**. Unsupported states stay disconnected, show no invented usage, and do not offer manual score input. iOS needs an Apple Family Controls capability/entitlement, user authorization and Device Activity app extensions in a custom signed build. Screen Time data is privacy restricted: implementing an Android-style raw JS usage query would be misleading. The report/monitor extensions and their data-sharing constraints must be designed and validated on an actual iPhone before scoring is enabled.

Apple references:
- https://developer.apple.com/documentation/familycontrols
- https://developer.apple.com/documentation/deviceactivity
- https://developer.apple.com/documentation/familycontrols/distributing-your-app-with-the-family-controls-capability

No blocking or background notifications are claimed or implemented. Existing Porn Reboot and Junk Food scoring remain unchanged.
