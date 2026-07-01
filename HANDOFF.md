# Weather Aware — Handoff Notes

Context that is **not** obvious from the code. Read this before making changes.

> Also read `AGENTS.md`: this project targets **Expo SDK 56**. Use the versioned docs at
> https://docs.expo.dev/versions/v56.0.0/ — do not assume a newer/older SDK.

## What the app is

React Native + Expo (SDK 56, Expo Router) mobile app. Users add plans (trips, outdoor
events, laundry, workouts, market runs) and get weather alerts before bad conditions hit.
Backend is Supabase (auth, Postgres, edge functions). Weather from Open-Meteo (free, no key).
Geocoding from Nominatim (free, no key).

## Environment constraints (important)

- Dev machine is **macOS 12.7 Monterey** → cannot install Xcode 26 → **cannot build native iOS**.
- **Expo Go does not work** (SDK 56 unsupported on the test device).
- **All testing is done on web:** `npx expo start --web`, viewed in Chrome DevTools with
  iPhone 12 Pro emulation.
- To test on a real phone you need HTTPS (browser geolocation requires it). Use a tunnel:
  ```
  npx expo start --web        # terminal 1
  npx localtunnel --port 8082 # terminal 2 → open the https URL on the phone
  ```
- Mac's local IP for LAN testing: run `ipconfig getifaddr en0`.

## Secrets / accounts

- Supabase project ref: `fxgdxwlfsubnjgopkqau` (name: Weather-Aware, region: EU Frankfurt).
- `.env` holds `EXPO_PUBLIC_SUPABASE_URL` + the **anon** key. Never the service-role key.
  **Never commit `.env`.**
- Supabase CLI needs a personal access token (env var `SUPABASE_ACCESS_TOKEN`) for
  `db push` / `functions deploy`. The token used during development was exposed in chat and
  should be **regenerated** at https://supabase.com/dashboard/account/tokens.

## Gotchas (these will re-break if forgotten)

- `Alert.alert` / `window.alert` are unreliable on web → use inline error state instead.
- `@react-native-community/datetimepicker` is **native-only** → on web we use an HTML
  `<input type="date">`/`<input type="time">` via `React.createElement` (see
  `components/DateTimeSelector.tsx`).
- `router.back()` throws on web (no history stack) → use `router.replace('/(tabs)')`.
- Maps: web uses an **OpenStreetMap iframe**. Apple Maps would need MapKit JS (an Apple
  Developer account + token), so it was not implemented.
- Location speed: use `getLastKnownPositionAsync()` then fall back to
  `getCurrentPositionAsync({ accuracy: Low })` — high accuracy is slow.
- `plans.user_id` is a FK to `public.users.id` (not `auth.users`). A DB trigger
  (`on_auth_user_created`) auto-creates the `public.users` row on signup; `add-plan.tsx`
  also upserts it defensively. Keep both.

## Status

### Done
- Auth (login/register) + one-time onboarding screen
- Plans tab: list view **and** month calendar view (toggle button) with color-coded
  weather dots
- Now/Weather screen: current conditions, hourly scroll, 5-day forecast, OSM map,
  rain animation, alert banner
- Settings: units (metric/imperial/hybrid), wind direction (compass/degrees),
  display mode (light/dark/system), live notification + location permission status,
  privacy text. Preferences are live via `SettingsContext` / `ThemeContext`.
- Add / Edit plan: activity chips, date-time picker, GPS + search location picker,
  weather scoring (green/amber/red), reschedule suggestions, **stakeholders**,
  **backup location**
- Weather scoring engine: per-activity thresholds (`constants/activityRules.ts`,
  `lib/scoring.ts`)
- Push notifications: edge function `supabase/functions/check-plans` deployed, runs daily
  via `pg_cron` (07:00 UTC) — re-scores upcoming plans and sends Expo push alerts
- DB: migrations 001–004 applied (schema, cron schedule, user-creation trigger,
  stakeholders + backup location)

### Pending / not built
- **Email notifications** — skipped. Needs a transactional email provider (e.g. Resend)
  API key, then wire sending into the `check-plans` edge function alongside the existing
  Expo push logic. Stakeholders already store email/phone + a `notify` flag.
- **SMS notifications** — discussed in the project report, never built.
- Role-based access (admin/organizer/viewer) — single-user-per-account today.

## Key paths

- Screens: `app/(tabs)/` (index=Plans, current-weather=Now, add-plan, settings),
  `app/plan/[id].tsx` (edit/delete), `app/(auth)/` (login, register, onboarding)
- Shared UI: `components/` (PlanCard, CalendarView, StakeholderManager, LocationPicker,
  DateTimeSelector, RainAnimation, LoadingScreen, AnimatedPressable, WeatherBadge)
- Logic: `lib/` (weather, scoring, geocoding, units, notifications, supabase)
- State: `contexts/` (SettingsContext, ThemeContext)
- DB: `supabase/migrations/`, `supabase/functions/check-plans/`
