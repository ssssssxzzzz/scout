import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  actCardFallbackText,
  buildActCardBlocks,
  type ActCardInput,
} from "../lib/act-cards.ts";
import {
  laneSecretNames,
  resolveLaneChannel,
  type SignalLane,
} from "../lib/channel-map.ts";
import { laneForSignalType, parseLane } from "../lib/lanes.ts";
import {
  checkDayDedupe,
  ensureLead,
  recordDayPost,
  storeFromKv,
} from "../lib/lead-state.ts";

const cardSchema = z.object({
  company: z.string().min(1),
  signal: z.string().min(1),
  whyAhp: z.string().min(1),
  nextStep: z.string().optional(),
  site: z.string().optional(),
  rank: z.string().optional(),
  signalType: z
    .string()
    .min(1)
    .describe("Primary signal type from score_lead (drives lane)."),
  lane: z
    .string()
    .optional()
    .describe(
      "Optional override: hot_excursions | facility_events | lab_moves | weekly | digest.",
    ),
});

type RouteRow = {
  company: string;
  lane: SignalLane;
  status: "posted" | "skipped_missing_channel" | "skipped_day_dedupe" | "failed";
  channelId?: string;
  messageTs?: string;
  hint?: string;
};

type RouteResult = {
  ok: boolean;
  posted: number;
  skipped: number;
  rows: RouteRow[];
};

export default defineTool({
  description: prompt`
    Route scored act cards to env-configured Slack lanes after one ZoomInfo
    scan. Lanes: hot_excursions (SCOUT_CHANNEL_HOT_EXCURSIONS or
    SCOUT_CHANNEL_HOT_LEADS), facility_events, lab_moves, weekly, digest.
    Missing channel IDs are skipped cleanly — never invent IDs.
    Same company within the UTC day is deduped via host.kv.
    Prefer this for lane fan-out; use post_act_cards for the current thread.
  `,
  effect: "write",
  inputSchema: z.object({
    cards: z.array(cardSchema).min(1).max(10),
  }),
  async execute({ cards }, ctx): Promise<RouteResult> {
    if (ctx.session.purpose === "eval") {
      return {
        ok: true,
        posted: 0,
        skipped: cards.length,
        rows: cards.map((c) => ({
          company: c.company,
          lane: (parseLane(c.lane) ??
            laneForSignalType(c.signalType)) as SignalLane,
          status: "skipped_missing_channel",
          hint: "Eval sessions do not post Slack lane alerts.",
        })),
      };
    }

    let client;
    try {
      client = await ctx.host.slack.getClient();
    } catch (error) {
      return {
        ok: false,
        posted: 0,
        skipped: cards.length,
        rows: cards.map((c) => ({
          company: c.company,
          lane: (parseLane(c.lane) ??
            laneForSignalType(c.signalType)) as SignalLane,
          status: "failed",
          hint: error instanceof Error ? error.message : String(error),
        })),
      };
    }

    const store = storeFromKv(ctx.host.kv);
    const rows: RouteRow[] = [];
    let posted = 0;
    let skipped = 0;

    for (let i = 0; i < cards.length; i++) {
      const raw = cards[i];
      const lane =
        parseLane(raw.lane) ?? laneForSignalType(raw.signalType);
      const channelId = resolveLaneChannel(lane);

      if (channelId === null) {
        skipped += 1;
        rows.push({
          company: raw.company,
          lane,
          status: "skipped_missing_channel",
          hint: `Unset secrets: ${laneSecretNames(lane).join(" or ")}. Skip cleanly.`,
        });
        continue;
      }

      const day = await checkDayDedupe(store, raw.company);
      if (day.duplicate) {
        skipped += 1;
        rows.push({
          company: raw.company,
          lane,
          status: "skipped_day_dedupe",
          channelId,
          hint: `Already posted today (${day.key}).`,
        });
        continue;
      }

      const card: ActCardInput = {
        company: raw.company,
        signal: raw.signal,
        whyAhp: raw.whyAhp,
        nextStep: raw.nextStep,
        site: raw.site,
        rank: raw.rank ?? String(i + 1),
        signalType: raw.signalType,
        lane,
      };

      try {
        const result = await client.chat.postMessage({
          channel: channelId,
          text: actCardFallbackText(card),
          blocks: buildActCardBlocks(card) as never,
        });
        if (result.ok && typeof result.ts === "string") {
          posted += 1;
          await recordDayPost(store, raw.company, {
            lane,
            channelId,
            messageTs: result.ts,
          });
          await ensureLead(store, {
            company: raw.company,
            signalType: raw.signalType,
            lane,
            channelId,
            messageTs: result.ts,
          });
          rows.push({
            company: raw.company,
            lane,
            status: "posted",
            channelId,
            messageTs: result.ts,
          });
        } else {
          skipped += 1;
          rows.push({
            company: raw.company,
            lane,
            status: "failed",
            channelId,
            hint: "Slack rejected the Block Kit card.",
          });
        }
      } catch (error) {
        skipped += 1;
        rows.push({
          company: raw.company,
          lane,
          status: "failed",
          channelId,
          hint: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      ok: posted > 0 || skipped === cards.length,
      posted,
      skipped,
      rows,
    };
  },
});
