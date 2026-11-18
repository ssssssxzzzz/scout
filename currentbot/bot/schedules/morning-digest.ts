import { buildSlackAuthContext } from "@grok/agent-sdk/channels/slack";
import { defineSchedule } from "@grok/agent-sdk/schedules";
import {
  DIGEST_TARGET_KV_KEY,
  digestTargetFromEnv,
  parseDigestTarget,
} from "../lib/digest-target.ts";
import { MORNING_DIGEST_PROMPT } from "../lib/morning-digest-prompt.ts";

/**
 * Weekday morning digest ≈ 7am America/New_York.
 * Cron is UTC: `0 12 * * 1-5` → 7am EST / 8am EDT.
 *
 * Hosted / production serve: fires on cron when the deployment is `running`.
 * `serve --dev`: does not auto-fire — trigger with:
 *   curl -X POST http://127.0.0.1:3000/<slug>/v1/dev/schedules/morning-digest
 *
 * Slack destination: Jacob says "send morning digests here" (tool
 * `set_digest_destination`), or set env/secret `SCOUT_DIGEST_CHANNEL_ID`.
 */
export default defineSchedule({
  cron: "0 12 * * 1-5",
  async run({ receive, waitUntil, host }) {
    const fromKv = parseDigestTarget(await host.kv.get(DIGEST_TARGET_KV_KEY));
    const target = fromKv ?? digestTargetFromEnv();

    if (target === null) {
      // Nothing to deliver until Jacob opts in from Slack.
      return;
    }

    let threadTs = "";
    try {
      const client = await host.slack.getClient();
      const posted = await client.chat.postMessage({
        channel: target.channelId,
        text: "Morning AHP digest — top signals for today (Slack only).",
      });
      if (posted.ok && typeof posted.ts === "string") {
        threadTs = posted.ts;
      }
    } catch {
      return;
    }

    if (threadTs === "") {
      return;
    }

    const auth = buildSlackAuthContext({
      channelId: target.channelId,
      threadTs,
      teamId: target.teamId,
      userId: target.userId,
      userName: target.userName,
    });

    waitUntil(
      receive("slack", {
        message: MORNING_DIGEST_PROMPT,
        auth,
        target: {
          channelId: target.channelId,
          threadTs,
          ...(target.teamId !== undefined ? { teamId: target.teamId } : {}),
        },
      }),
    );
  },
});
