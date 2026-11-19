# Weekday morning digest

Short Slack-only AHP digest. Use when the `morning-digest` schedule fires, or when Jacob says "morning digest" / "daily digest", or when he asks what schedules exist (list this **and** Monday `weekly-brief`).

This is **not** alert mode. ZoomInfo's own app covers alerts. Keep this to **≤3** act cards — prefer **0–2 excellent** over padding.

## Hard quality bar

Prefer **facility/ops scoops**:

- Expansions, new suites, shutdowns, cleanroom / validation / commissioning
- Lab-landlord moves (Alexandria / Longfellow)
- Plant engineering / QA / sterile / validation hiring tied to a **named site or suite**

**Drop or demote** bare intent-only (EM score with HQ-only, no suite/plant named) unless paired with a facility scoop or named manufacturing site.

If nothing clears the bar, post **No AHP-grade facility moves today** — do **not** fill with intent scores or generic hiring scoops.

Never lead with aesthetics / cosmetic HQ intent (e.g. Merz) unless a Raleigh plant/suite is confirmed.

Fujifilm Morrisville is the current client: tag carefully; do not treat every EM blip as a digest card. Holly Springs and College Station stay separate sites.

Keep: **Why this matters for AHP**, act buttons via `post_act_cards`, Digests here opt-in, Slack-only, no Nighthawk.

## Cadence

- Schedule file: `bot/schedules/morning-digest.ts` — registered via `defineSchedule` (`kind: run`)
- Cron: `0 12 * * 1-5` (weekdays 12:00 **UTC** ≈ **7am ET** in EST / **8am ET** in EDT)
- Sibling: Monday `weekly-brief` at `0 13 * * 1` UTC ≈ 8am ET — longer 5–10 card brief (same quality bar; may list more)
- Destination: Slack chat saved by `set_digest_destination` ("send morning digests here" / chip **Digests here**), or env/secret `SCOUT_DIGEST_CHANNEL_ID`. Without a destination the cron still exists but posts nothing — say that; do not claim the schedule is missing.
- Production / hosted `running` deploy: fires on cron
- `serve --dev`: **does not** auto-fire. Trigger by hand:

```bash
curl -X POST http://127.0.0.1:3000/currentbot/v1/dev/schedules/morning-digest
```

Or DM: `morning digest`.

## Procedure

1. `get_watchlist` — tag only. Do not invent names. Tag Fujifilm Morrisville carefully when it appears; do not auto-promote every EM hit.
2. `get_mute_list` — drop matching noise.
3. Geo: **North Carolina** state alone unless he overrides. Soft bias RTP / Morrisville / Holly Springs. NC HQ with plant elsewhere does not count.
4. Run the three searches in skill `three-feeds` (separate calls). Apply that skill's quality bar. Cap this digest at **≤3** cards total (unlike the Monday weekly brief's length).
5. Filter hard: facility/ops first; bare intent only as support when a named plant/suite exists.
6. Each kept card: company, **named site/suite**, Observed signal + date, next step, **Why this matters for AHP**.
7. If ≥1 card: call `post_act_cards` with the same ≤3 cards (**Prep me / Mute this / Add to watchlist**). If 0 cards: say **No AHP-grade facility moves today** and skip `post_act_cards`.
8. Close with dig-in by number or tap a button when cards exist. No GTM / bulk enrich. No Nighthawk. No mcp oauth. Slack only.
