import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import {
  DIGEST_TARGET_KV_KEY,
  digestTargetFromEnv,
  parseDigestTarget,
} from "../lib/digest-target.ts";

export default defineTool({
  description: prompt`
    Show where weekday morning digests post in Slack (channel id only).
    Empty means Jacob still needs to say "send morning digests here".
  `,
  effect: "read",
  async execute(_args, ctx) {
    const fromKv = parseDigestTarget(await ctx.host.kv.get(DIGEST_TARGET_KV_KEY));
    if (fromKv) {
      return {
        ok: true,
        source: "kv",
        channelId: fromKv.channelId,
        teamId: fromKv.teamId ?? null,
        setAt: fromKv.setAt,
      };
    }
    const fromEnv = digestTargetFromEnv();
    if (fromEnv) {
      return {
        ok: true,
        source: "env",
        channelId: fromEnv.channelId,
        teamId: fromEnv.teamId ?? null,
        setAt: fromEnv.setAt,
      };
    }
    return {
      ok: false,
      source: null,
      hint: 'No digest destination yet. Ask Jacob to say "send morning digests here" in the Slack chat that should receive weekday mornings.',
    };
  },
});
