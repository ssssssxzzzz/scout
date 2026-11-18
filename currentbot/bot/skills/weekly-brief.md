# Weekly Monday AM brief

Unbiased North Carolina ranking for Jacob. Use when the `weekly-brief` schedule fires, or when he says "weekly brief" / "Monday brief".

The watchlist does not pick this brief. Rank the scan. Tag a watchlist match when one appears.

## Cadence

- Schedule file: `bot/schedules/weekly-brief.md`
- Cron: `0 13 * * 1` (Monday 13:00 **UTC** ≈ 8am ET / 9am EDT)
- Production / non-dev `agent-sdk serve`: fires on cron automatically (one process only)
- `serve --dev`: **does not** auto-fire. Trigger by hand:

```bash
curl -X POST http://127.0.0.1:3000/zoominfo-brief/v1/dev/schedules/weekly-brief
```

Or DM the bot: `weekly brief`.

## Procedure

1. `get_watchlist` — tag only. Do not filter or rank by it. Do not invent account names. Fujifilm Morrisville is the current client. Holly Springs and College Station stay separate sites. A tag does not move the rank.
2. `get_mute_list` — drop matching noise.
3. Geo: **North Carolina** state alone unless he overrides. Rank the whole state. Recency and actionability decide order.
4. Run the three searches in skill `three-feeds`. Ignore that skill's watchlist-first step and its 3-card cap.
5. Post **5–10** ranked actionable events. Fewer when the week is thin. Never pad. Each line: rank, company, site, Observed signal + date, one **Why this matters for AHP** line (6-log / 24h mobilize / shutdown).
6. Rank by facility move, suite work, shutdown, clean utilities, sterile / QA / facilities / validation leadership, or Environmental Monitoring / Sterile/Aseptic Manufacturing intent. An NC headquarters whose plant is elsewhere does not count.
7. Call `post_act_cards` with the **top 3** only (Prep me / Mute this / Add to watchlist). Close with dig-in by number for the rest.
8. No GTM / bulk enrich unless asked. No Nighthawk. No mcp oauth. Slack only — no ZoomInfo website.
