# SpokeToWork Mobile — Expo/React Native

## Decision: Separate Repo, Not a Fork

A fork carries all the Next.js/Tailwind/DaisyUI/Docker/Playwright infrastructure — none of which applies to React Native. Starting fresh with `npx create-expo-app` is faster than deleting 90% of a fork.

**New repo:** `TortoiseWolfe/SpokeToWork-Mobile`

## Shared Backend

Both apps use the same Supabase project:
- Same auth (GoTrue) — users sign in to either app
- Same database (conversations, messages, connections)
- Same RLS policies
- Same Realtime subscriptions
- Same E2E encryption protocol (ECDH P-256 + AES-GCM)

## What to Reuse (Copy, Don't Import)

Copy these files from the web repo and adapt as needed:

| Web Source | Mobile Equivalent | Notes |
|-----------|-------------------|-------|
| `src/types/messaging.ts` | `src/types/messaging.ts` | Direct copy — pure TypeScript |
| `src/services/messaging/message-service.ts` | `src/services/message-service.ts` | Replace Supabase browser client with RN client |
| `src/services/messaging/connection-service.ts` | `src/services/connection-service.ts` | Same |
| `src/services/messaging/key-service.ts` | `src/services/key-service.ts` | Replace `localStorage` with `expo-secure-store` |
| `src/lib/messaging/encryption.ts` | `src/lib/encryption.ts` | Replace WebCrypto with `expo-crypto` or `react-native-quick-crypto` |
| `src/lib/supabase/client.ts` | `src/lib/supabase.ts` | Use `@supabase/supabase-js` with AsyncStorage adapter |

**Don't copy:** Components, hooks tied to Next.js router, CSS/Tailwind, Playwright tests, Docker config.

## What to Rewrite

### UI Components
- **Web:** DaisyUI + Tailwind CSS
- **Mobile:** React Native Paper, Tamagui, or NativeWind (Tailwind for RN)
- Recommendation: **NativeWind** if you want to reuse Tailwind knowledge

### Navigation
- **Web:** Next.js App Router (`src/app/`)
- **Mobile:** Expo Router (file-based, similar to Next.js)
- Maps well: `/messages` → `app/messages.tsx`, `/map` → `app/map.tsx`

### Maps
- **Web:** MapLibre GL via `react-map-gl/maplibre`
- **Mobile:** `react-native-maps` (Google Maps/Apple Maps)
- Route optimization: Same ORS API, different map renderer

### Storage
- **Web:** `localStorage` for key cache, IndexedDB removed
- **Mobile:** `expo-secure-store` for encryption keys (hardware-backed), `@react-native-async-storage/async-storage` for preferences

### Offline
- **Web:** Service Worker + `@/lib/offline-queue`
- **Mobile:** WatermelonDB or MMKV for local cache, NetInfo for connectivity detection

### Encryption
- **Web:** WebCrypto API (`crypto.subtle`)
- **Mobile:** `react-native-quick-crypto` (native OpenSSL bindings, same API surface as WebCrypto)
- Argon2id: `react-native-argon2` (native implementation, much faster than WASM)

## Recommended Expo Stack

```
npx create-expo-app SpokeToWork-Mobile --template tabs
```

| Category | Package | Why |
|----------|---------|-----|
| Framework | Expo SDK 52+ | Managed workflow, EAS Build |
| Navigation | expo-router | File-based like Next.js |
| UI | NativeWind v4 | Reuse Tailwind knowledge |
| State | Zustand or Context | Same as web |
| Supabase | @supabase/supabase-js | Same client, AsyncStorage adapter |
| Auth | supabase-auth-helpers | Deep linking for OAuth callbacks |
| Maps | react-native-maps | Google/Apple native maps |
| Crypto | react-native-quick-crypto | ECDH + AES-GCM (matches web) |
| KDF | react-native-argon2 | Native Argon2id (10x faster than WASM) |
| Secure Storage | expo-secure-store | Hardware-backed key storage |
| Offline | @nozbe/watermelondb | SQLite-based sync |
| Push | expo-notifications | APNs + FCM |

## Build & Deploy

- **Development:** `npx expo start` (Expo Go for quick iteration)
- **Builds:** EAS Build (`eas build --platform all`)
- **Submit:** EAS Submit (`eas submit --platform ios` / `--platform android`)
- **CI/CD:** GitHub Actions with `expo-github-action`

## Portfolio Value

This demonstrates:
- React Native / mobile development
- Cross-platform code sharing strategy
- E2E encryption on mobile (hardware-backed secure storage)
- Real-time messaging with Supabase Realtime
- Map integration with route optimization
- App Store / Play Store deployment pipeline

## First Steps

1. Create repo `TortoiseWolfe/SpokeToWork-Mobile`
2. `npx create-expo-app SpokeToWork-Mobile --template tabs`
3. Add Supabase client + auth
4. Copy types + service layer from web repo
5. Build login screen → messages screen → map screen
6. Add encryption (react-native-quick-crypto + react-native-argon2)
7. EAS Build → TestFlight / Internal Testing
8. App Store / Play Store submission
