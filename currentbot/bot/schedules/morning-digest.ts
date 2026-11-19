import { buildSlackAuthContext } from "@grok/agent-sdk/channels/slack";
import { defineSchedule } from "@grok/agent-sdk/schedules";
import {
  DIGEST_TARGET_KV_KEY,
  digestTargetFromEnv,
  parseDigestTarget,
} from "../lib/digest-target.ts";
import { MORNING_DIGEST_PROMPT } from "../lib/morning-digest-prompt.ts";
import { postOps } from "../lib/ops.ts";

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
 *
 * Failures / auth errors post to `SCOUT_OPS_CHANNEL_ID` when configured.
 */
export default defineSchedule({
  cron: "0 12 * * 1-5",
  async run({ receive, waitUntil, host }) {
    try {
      const fromKv = parseDigestTarget(await host.kv.get(DIGEST_TARGET_KV_KEY));
      const target = fromKv ?? digestTargetFromEnv();

      if (target === null) {
        await postOps(
          () => host.slack.getClient(),
          "info",
          "morning-digest skipped — no destination",
          "Set Digests here in Slack or secret SCOUT_DIGEST_CHANNEL_ID.",
        );
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
        } else {
          const err =
            typeof (posted as { error?: unknown }).error === "string"
              ? (posted as { error: string }).error
              : "unknown";
          await postOps(
            () => host.slack.getClient(),
            "failure",
            "morning-digest chat.postMessage failed",
            `channel=${target.channelId} error=${err}`,
          );
          return;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const authLike = /auth|token|not_authed|invalid_auth|account_inactive/i.test(
          msg,
        );
        await postOps(
          () => host.slack.getClient(),
          authLike ? "auth_error" : "failure",
          "morning-digest Slack client/post failed",
          msg,
        );
        return;
      }

      if (threadTs === "") {
        await postOps(
          () => host.slack.getClient(),
          "failure",
          "morning-digest got empty thread ts",
          `channel=${target.channelId}`,
        );
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      try {
        await postOps(
          () => host.slack.getClient(),
          "failure",
          "morning-digest unhandled error",
          msg,
        );
      } catch {
        // Soft: never throw out of schedule after ops attempt.
      }
    }
  },
});
