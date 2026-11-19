import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { scoreLead, type ScoreFactorId } from "../lib/scoring.ts";
import { whyNowFromScore } from "../lib/why-now.ts";

const factorKeys = [
  "facility_expansion",
  "suite_qualification",
  "shutdown_signal",
  "cleanroom_validation",
  "landlord_move",
  "buyer_adjacent_hiring",
  "intent_site_named",
  "intent_paired",
  "watchlist_priority",
  "watchlist_competitor",
  "rtp_geo",
  "named_site",
] as const;

type FactorKey = (typeof factorKeys)[number];

export default defineTool({
  description: prompt`
    Score one AHP lead candidate with config/scoring.yaml weights.
    Returns total, breakdown dict, clearsThreshold (~50), and a
    deterministic templated why-now (no freeform invent).
    Call before posting an act card when you want an explicit score.
  `,
  effect: "read",
  inputSchema: z.object({
    company: z.string().min(1),
    factors: z
      .object({
        facility_expansion: z.boolean().optional(),
        suite_qualification: z.boolean().optional(),
        shutdown_signal: z.boolean().optional(),
        cleanroom_validation: z.boolean().optional(),
        landlord_move: z.boolean().optional(),
        buyer_adjacent_hiring: z.boolean().optional(),
        intent_site_named: z.boolean().optional(),
        intent_paired: z.boolean().optional(),
        watchlist_priority: z.boolean().optional(),
        watchlist_competitor: z.boolean().optional(),
        rtp_geo: z.boolean().optional(),
        named_site: z.boolean().optional(),
      })
      .describe("Set true for each scoring factor that applies."),
    signalType: z
      .string()
      .optional()
      .describe("Dedup key override; defaults to strongest primary factor."),
  }),
  async execute({ company, factors, signalType }) {
    const factorMap: Partial<Record<ScoreFactorId, boolean>> = {};
    for (const key of factorKeys) {
      if (factors[key as FactorKey] === true) {
        factorMap[key as ScoreFactorId] = true;
      }
    }
    const score = scoreLead({
      factors: factorMap,
      ...(signalType !== undefined ? { signalType } : {}),
    });
    const why = whyNowFromScore(score);
    return {
      ok: true,
      company: company.trim(),
      total: score.total,
      threshold: score.threshold,
      clearsThreshold: score.clearsThreshold,
      breakdown: score.breakdown,
      primaryFactor: score.primaryFactor,
      signalType: score.signalType,
      whyNow: why.whyNow,
      whyNowLines: why.lines,
      cooldownDays: score.config.cooldownDays,
      scoreJumpRealert: score.config.scoreJumpRealert,
    };
  },
});
