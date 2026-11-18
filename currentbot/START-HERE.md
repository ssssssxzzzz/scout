# START HERE (Jacob)

Live ZoomInfo via Cursor-account MCP + Slack Socket Mode.

## Every time you use the bot

```bash
cd /agent/zoominfo-brief
# If Slack fails auth: bash save-slack-tokens.sh  (paste tokens in the terminal only; don't put them in chat)
npx @grok/agent-sdk@0.6.0 serve --dir . --dev
```

Leave that terminal running. Wait for `Socket Mode connected`.

In Slack, try: **help** → then **1** (facility moves) or a suggested-prompt chip.

## Weekly Monday brief

Schedule: `bot/schedules/weekly-brief.md` — cron `0 13 * * 1` (Monday 13:00 UTC).

- Production / non-dev serve: fires on cron.
- `--dev` does **not** auto-fire. Trigger:

```bash
curl -X POST http://127.0.0.1:3000/zoominfo-brief/v1/dev/schedules/weekly-brief
```

Or DM: **weekly brief** / menu **6**.

## Do not

- Connect Finance-xai
- Run `mcp oauth zoominfo` (Vendor "Agent SDK" is rejected)
- Connect the leftover **user** ZoomInfo MCP — use the **plugin** ZoomInfo only

## Connection file

`bot/mcp-connections/account.ts` must be `cursorAccount: true` with Zoominfo servers only.  
There must be **no** `bot/host-connections` and **no** oauth `zoominfo.ts`.
