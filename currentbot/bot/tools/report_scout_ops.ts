import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { postOps } from "../lib/ops.ts";

export default defineTool({
  description: prompt`
    Post a short note to the Scout ops Slack channel (SCOUT_OPS_CHANNEL_ID).
    Use for digest zero-results, ZoomInfo auth failures, or schedule issues.
    No-ops softly when the ops channel secret is unset.
  `,
  effect: "write",
  inputSchema: z.object({
    kind: z.enum(["failure", "zero_results", "auth_error", "heartbeat", "info"]),
    title: z.string().min(1),
    detail: z.string().optional(),
  }),
  async execute({ kind, title, detail }, ctx) {
    if (ctx.session.purpose === "eval") {
      return {
        ok: true,
        skipped: true,
        reason: "eval_skipped",
      };
    }

    const result = await postOps(
      () => ctx.host.slack.getClient(),
      kind,
      title,
      detail,
    );
    return result;
  },
});
