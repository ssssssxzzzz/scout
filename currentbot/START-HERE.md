# START HERE (Jacob)

Live bot: the Cursor-hosted deployment. Source is GitHub `ssssssxzzzz/scout`, folder `currentbot`. A change ships when that ref is deployed.

## Phone menu

In Slack, say **help**. Six playbook buttons show up in the thread. Tap one. Typing **1** through **6** still works. Desktop also shows up to four suggested-prompt chips.

## Weekly Monday brief

Schedule: `bot/schedules/weekly-brief.md` — cron `0 13 * * 1` (Monday 13:00 UTC) on the hosted deployment.

Or DM: **weekly brief** / menu **6**.

## Do not

- Connect Finance-xai
- Run `mcp oauth zoominfo` (Vendor "Agent SDK" is rejected)
- Connect the leftover **user** ZoomInfo MCP — use the **plugin** ZoomInfo only

## Connection file

`bot/mcp-connections/account.ts` must be `cursorAccount: true` with Zoominfo servers only.  
There must be **no** `bot/host-connections` and **no** oauth `zoominfo.ts`.
