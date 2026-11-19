import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  actCardFallbackText,
  buildActCardBlocks,
  type ActCardInput,
} from "../lib/act-cards.ts";
import { parseLane } from "../lib/lanes.ts";
import { ensureLead, storeFromKv } from "../lib/lead-state.ts";

const cardSchema = z.object({
  company: z.string().min(1),
  signal: z.string().min(1),
  whyAhp: z.string().min(1),
  nextStep: z.string().optional(),
  site: z.string().optional(),
  rank: z.string().optional(),
  signalType: z.string().optional(),
  lane: z.string().optional(),
});

type PostResult = {
  ok: boolean;
  posted: number;
  reason?: string;
  hint?: string;
  messageTs?: string[];
};

export default defineTool({
  description: prompt`
    Post Slack Block Kit act cards with one-tap buttons:
    Claim, Contacted, Not a fit, Suppress, Prep me, Mute this, Add to watchlist.
    Call this after a morning digest or menu result (≤3 cards) in the current
    thread. Prefer whyAhp from score_lead templated why-now (no freeform invent).
    For lane fan-out to env-configured channels, also call route_lead_alerts.
    Only works inside a Slack thread.
  `,
  effect: "write",
  inputSchema: z.object({
    cards: z.array(cardSchema).min(1).max(3),
  }),
  async execute({ cards }, ctx): Promise<PostResult> {
    if (ctx.session.purpose === "eval") {
      return {
        ok: true,
        posted: 0,
        reason: "eval_skipped",
        hint: "Eval sessions do not post Slack Block Kit cards.",
      };
    }

    const attrs = ctx.session.auth?.attributes ?? {};
    const channelId =
      typeof attrs.channel_id === "string" ? attrs.channel_id.trim() : "";
    const threadTs =
      typeof attrs.thread_ts === "string" ? attrs.thread_ts.trim() : "";

    if (channelId === "" || threadTs === "") {
      return {
        ok: false,
        posted: 0,
        reason: "not_in_slack_thread",
        hint: "Act buttons only post when the turn is in a Slack thread. Still list the cards as text.",
      };
    }

    let client;
    try {
      client = await ctx.host.slack.getClient();
    } catch (error) {
      return {
        ok: false,
        posted: 0,
        reason: "slack_client_unavailable",
        hint: error instanceof Error ? error.message : String(error),
      };
    }

    const store = storeFromKv(ctx.host.kv);
    const messageTs: string[] = [];
    let posted = 0;
    for (let i = 0; i < cards.length; i++) {
      const lane = parseLane(cards[i].lane ?? null) ?? undefined;
      const card: ActCardInput = {
        company: cards[i].company,
        signal: cards[i].signal,
        whyAhp: cards[i].whyAhp,
        nextStep: cards[i].nextStep,
        site: cards[i].site,
        signalType: cards[i].signalType,
        rank: cards[i].rank ?? String(i + 1),
        ...(lane ? { lane } : {}),
      };
      const text = actCardFallbackText(card);
      const result = await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text,
        // Slack WebClient Block Kit types are stricter than our builders.
        blocks: buildActCardBlocks(card) as never,
      });
      if (result.ok && typeof result.ts === "string") {
        messageTs.push(result.ts);
        posted += 1;
        await ensureLead(store, {
          company: card.company,
          signalType: card.signalType,
          lane,
          channelId,
          messageTs: result.ts,
        });
      }
    }

    return {
      ok: posted > 0,
      posted,
      ...(posted === 0
        ? {
            reason: "post_failed",
            hint: "Slack rejected the Block Kit cards. Keep the text summary.",
          }
        : {}),
      messageTs,
    };
  },
});
