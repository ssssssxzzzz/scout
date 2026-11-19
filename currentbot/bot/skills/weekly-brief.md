# Weekly Monday AM brief

Unbiased North Carolina ranking for Jacob. Use when the `weekly-brief` schedule fires, or when he says "weekly brief" / "Monday brief".

The watchlist does not pick this brief. Rank the scan. Tag a watchlist match when one appears.

Same **hard quality bar** as morning digest / playbooks 1–4 (skill `three-feeds`): facility/ops first; bare intent is support only. Length may be **5–10**, but never pad with HQ-only EM scores or generic hiring.

## Cadence

- Schedule file: `bot/schedules/weekly-brief.md`
- Cron: `0 13 * * 1` (Monday 13:00 **UTC** ≈ 8am ET / 9am EDT)
- Sibling schedule (also registered): **`morning-digest`** weekdays `0 12 * * 1-5` UTC ≈ 7am ET — short ≤3 cards under the same quality bar. Do not tell Jacob weekly is the only schedule.
- Production / hosted `running` deploy: fires on cron automatically (one process only)
- `serve --dev`: **does not** auto-fire. Trigger by hand:

```bash
curl -X POST http://127.0.0.1:3000/currentbot/v1/dev/schedules/weekly-brief
```

Or DM the bot: `weekly brief`.

## Procedure

1. `get_watchlist` — tag only. Do not filter or rank by it. Do not invent account names. Fujifilm Morrisville is the current client — tag carefully; do not promote every EM blip. Holly Springs and College Station stay separate sites. A tag does not move the rank.
2. `get_mute_list` — drop matching noise.
3. Geo: **North Carolina** state alone unless he overrides. Rank the whole state. Recency and actionability decide order. NC HQ with plant elsewhere does not count.
4. Run the three searches in skill `three-feeds`. Ignore that skill's watchlist-first step and its 3-card length cap. **Keep** that skill's hard quality bar (facility/ops first; bare intent demoted).
5. Post **5–10** ranked AHP-grade events when they clear the bar. Fewer when the week is thin. Prefer fewer excellent over padding. If nothing clears: **No AHP-grade facility moves today** (or this week) — do not fill with intent scores.
6. Rank by facility move, suite work, shutdown, cleanroom / validation / commissioning, clean utilities, Alexandria / Longfellow landlord moves, sterile / QA / facilities / validation leadership at a **named site**. Intent (EM / Sterile/Aseptic) only boosts a card when a named plant/suite is present or a facility scoop pairs it. Never lead with aesthetics / cosmetic HQ intent (e.g. Merz) unless a Raleigh plant/suite is confirmed.
7. Each line: rank, company, **named site**, Observed signal + date, one **Why this matters for AHP** line (6-log / 24h mobilize / shutdown).
8. Call `post_act_cards` with the **top ≤3** that cleared the bar (include `signalType`; Claim / Contacted / Not a fit / Suppress + Prep / Mute / Watchlist). Then `route_lead_alerts` (use `lane=weekly` for the Monday rollup channel when set). Skip both if zero. Close with dig-in by number for the rest.
9. No GTM / bulk enrich unless asked. No Nighthawk. No mcp oauth. Slack only — no ZoomInfo website.
