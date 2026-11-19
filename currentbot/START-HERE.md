# START HERE (Jacob)

Live bot: the Cursor-hosted deployment. Source is GitHub `ssssssxzzzz/scout`, folder `currentbot`. A change ships when that ref is deployed.

**Boss rule:** Slack only. No ZoomInfo website. No alert-mode spam (ZI app covers alerts).

## Phone menu

In Slack, say **help**. Six playbook buttons show up in the thread. Tap one. Typing **1** through **6** still works. Desktop also shows up to four suggested-prompt chips.

## Weekday morning digest (wow #1)

Schedule: `bot/schedules/morning-digest.ts` — cron `0 12 * * 1-5` UTC (≈ **7am ET** EST / **8am ET** EDT).

1. In Slack, tap **Digests here** (or say `send morning digests here`) once so the bot saves this chat.
2. Hosted deploy with status `running` fires the schedule automatically.
3. `--dev` does **not** auto-fire. Trigger:

```bash
curl -X POST http://127.0.0.1:3000/currentbot/v1/dev/schedules/morning-digest
```

Optional fallback (private terminal / secret set — never paste into chat): `SCOUT_DIGEST_CHANNEL_ID`.

## One-tap act buttons (wow #3 + Phase 2)

Digest and menu cards call `post_act_cards` so Slack shows:

- **Claim** → assigns lead (`owner_slack_id`); idempotent in-place update
- **Contacted** → marks contacted
- **Not a fit** → reason picker → 90-day suppress
- **Suppress** → durable suppress (stops re-alerts for that company)
- **Prep me** / **Mute this** / **Add to watchlist** (unchanged)

Won/lost in chat → tool `record_lead_outcome` (no slash commands).

## Phase 1 foundation (preserve)

- Scoring: `config/scoring.yaml` (threshold ~50). Tools: `score_lead`, `check_lead_alert`.
- Suppression seed: `config/suppression_seed.csv` → `host.kv` (not SQLite / ephemeral disk).
- Ops channel: set `SCOUT_OPS_CHANNEL_ID` for schedule failures + daily heartbeat (`ops-heartbeat` cron `0 11 * * *` UTC).

## Phase 2 lane routing

- Tool `route_lead_alerts` posts cards to signal lanes when secrets are set; missing IDs skip cleanly.
- Secrets (create channels + invite the bot, then `secret set`):
  - `SCOUT_CHANNEL_HOT_EXCURSIONS` (or alias `SCOUT_CHANNEL_HOT_LEADS`)
  - `SCOUT_CHANNEL_FACILITY_EVENTS`
  - `SCOUT_CHANNEL_LAB_MOVES`
  - `SCOUT_CHANNEL_WEEKLY`
  - `SCOUT_OPS_CHANNEL_ID` / `SCOUT_DIGEST_CHANNEL_ID`
- Full list: `.env.example`. Never paste token values into chat.

## Weekly Monday brief

Schedule: `bot/schedules/weekly-brief.md` — cron `0 13 * * 1` (Monday 13:00 UTC) on the hosted deployment.

Or DM: **weekly brief** / menu **6**.

## Hosted redeploy (when you ask for it)

```bash
npx --yes @grok/agent-sdk@0.6.0 deploy \
  --dir ./currentbot \
  --path currentbot \
  --team 66891138 \
  --repo https://github.com/ssssssxzzzz/scout \
  --ref <branch-or-sha>
```

Schedules in `bot/schedules/` replace hosted schedules on each deploy. No extra "enable cron" switch — a `running` deployment fires them.

## Do not

- Connect Finance-xai
- Run `mcp oauth zoominfo` (Vendor "Agent SDK" is rejected)
- Connect the leftover **user** ZoomInfo MCP — use the **plugin** ZoomInfo only
- Ask the boss to open ZoomInfo.com

## Connection file

`bot/mcp-connections/account.ts` must be `cursorAccount: true` with Zoominfo servers only.  
There must be **no** `bot/host-connections` and **no** oauth `zoominfo.ts`.
