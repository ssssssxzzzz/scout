# Weekday morning digest

Short Slack-only AHP digest. Use when the `morning-digest` schedule fires, or when Jacob says "morning digest" / "daily digest", or when he asks what schedules exist (list this **and** Monday `weekly-brief`).

This is **not** alert mode. ZoomInfo's own app covers alerts. Keep this to ~3 act cards.

## Cadence

- Schedule file: `bot/schedules/morning-digest.ts` — registered via `defineSchedule` (`kind: run`)
- Cron: `0 12 * * 1-5` (weekdays 12:00 **UTC** ≈ **7am ET** in EST / **8am ET** in EDT)
- Sibling: Monday `weekly-brief` at `0 13 * * 1` UTC ≈ 8am ET — longer 5–10 card brief
- Destination: Slack chat saved by `set_digest_destination` ("send morning digests here" / chip **Digests here**), or env/secret `SCOUT_DIGEST_CHANNEL_ID`. Without a destination the cron still exists but posts nothing — say that; do not claim the schedule is missing.
- Production / hosted `running` deploy: fires on cron
- `serve --dev`: **does not** auto-fire. Trigger by hand:

```bash
curl -X POST http://127.0.0.1:3000/currentbot/v1/dev/schedules/morning-digest
```

Or DM: `morning digest`.

## Procedure

1. `get_watchlist` — tag only. Do not invent names.
2. `get_mute_list` — drop matching noise.
3. Geo: **North Carolina** state alone unless he overrides. Soft bias RTP / Morrisville / Holly Springs.
4. Run the three searches in skill `three-feeds` (separate calls). Cap this digest at **≤3** cards total (unlike the Monday weekly brief).
5. Each card: company, site, Observed signal + date, next step, **Why this matters for AHP**.
6. Call `post_act_cards` with the same ≤3 cards so Slack shows **Prep me / Mute this / Add to watchlist**.
7. Close with dig-in by number or tap a button. No GTM / bulk enrich. No Nighthawk. No mcp oauth.
