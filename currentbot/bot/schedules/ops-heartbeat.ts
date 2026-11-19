import { defineSchedule } from "@grok/agent-sdk/schedules";
import { loadChannelMap } from "../lib/channel-map.ts";
import { DIGEST_TARGET_KV_KEY, parseDigestTarget } from "../lib/digest-target.ts";
import { opsChannelConfigured, postOps } from "../lib/ops.ts";
import { loadScoringConfig } from "../lib/scoring.ts";

/**
 * Daily ops heartbeat → SCOUT_OPS_CHANNEL_ID.
 * Cron UTC `0 11 * * *` ≈ 6am ET EST / 7am ET EDT (before morning digest).
 *
 * `--dev` does not auto-fire:
 *   curl -X POST http://127.0.0.1:3000/<slug>/v1/dev/schedules/ops-heartbeat
 */
export default defineSchedule({
  cron: "0 11 * * *",
  async run({ host }) {
    try {
      if (!opsChannelConfigured()) {
        return;
      }

      const map = loadChannelMap();
      const fromKv = parseDigestTarget(await host.kv.get(DIGEST_TARGET_KV_KEY));
      const scoring = loadScoringConfig();
      const digestArmed = fromKv !== null || map.digest !== null;

      const lines = [
        `digest_armed=${digestArmed}`,
        `digest_channel=${map.digest ? "set" : "unset"}`,
        `hot_leads=${map.hotLeads ? "set" : "unset"}`,
        `weekly=${map.weekly ? "set" : "unset"}`,
        `ops=set`,
        `threshold=${scoring.threshold}`,
        `cooldown_days=${scoring.cooldownDays}`,
        `score_jump_realert=${scoring.scoreJumpRealert}`,
        `utc=${new Date().toISOString()}`,
      ];

      await postOps(
        () => host.slack.getClient(),
        "heartbeat",
        "Scout daily heartbeat — schedules alive",
        lines.join(" · "),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      try {
        await postOps(
          () => host.slack.getClient(),
          "failure",
          "ops-heartbeat failed",
          msg,
        );
      } catch {
        // Soft.
      }
    }
  },
});
