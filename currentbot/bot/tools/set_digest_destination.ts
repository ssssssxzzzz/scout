import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  DIGEST_TARGET_KV_KEY,
  type DigestTarget,
} from "../lib/digest-target.ts";

export default defineTool({
  description: prompt`
    Save this Slack conversation as the weekday morning digest destination.
    Use when Jacob says "send morning digests here", "digests here", or
    "morning digest in this chat". Slack-only — no ZoomInfo website.
  `,
  effect: "write",
  inputSchema: z.object({
    confirm: z
      .boolean()
      .describe("True when Jacob asked to land weekday digests in this chat."),
  }),
  async execute({ confirm }, ctx) {
    if (!confirm) {
      return {
        ok: false,
        reason: "not_confirmed",
        hint: "Ask Jacob to say send morning digests here, then call again with confirm=true.",
      };
    }

    const attrs = ctx.session.auth?.attributes ?? {};
    const channelId =
      typeof attrs.channel_id === "string" ? attrs.channel_id.trim() : "";
    if (channelId === "") {
      return {
        ok: false,
        reason: "not_in_slack",
        hint: "This only works from a Slack DM or thread.",
      };
    }

    const target: DigestTarget = {
      channelId,
      ...(typeof attrs.team_id === "string" && attrs.team_id !== ""
        ? { teamId: attrs.team_id }
        : {}),
      ...(typeof attrs.user_id === "string" && attrs.user_id !== ""
        ? { userId: attrs.user_id }
        : {}),
      ...(typeof attrs.user_name === "string" && attrs.user_name !== ""
        ? { userName: attrs.user_name }
        : {}),
      setAt: new Date().toISOString(),
    };

    await ctx.host.kv.put(DIGEST_TARGET_KV_KEY, target);
    return {
      ok: true,
      target: {
        channelId: target.channelId,
        teamId: target.teamId ?? null,
        setAt: target.setAt,
      },
      note: "Weekday morning digests (~7am ET) will post in this Slack chat after the next hosted deploy that includes the morning-digest schedule.",
    };
  },
});
