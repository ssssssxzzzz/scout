/**
 * Deterministic why-now from score breakdown — no freeform invent.
 * Templates live in config/scoring.yaml (why_now map).
 */

import {
  loadScoringConfig,
  type ScoreBreakdown,
  type ScoreFactorId,
  type ScoreResult,
} from "./scoring.ts";

const FACTOR_ORDER: ScoreFactorId[] = [
  "facility_expansion",
  "shutdown_signal",
  "suite_qualification",
  "cleanroom_validation",
  "landlord_move",
  "buyer_adjacent_hiring",
  "intent_site_named",
  "intent_paired",
  "named_site",
  "watchlist_priority",
  "watchlist_competitor",
  "rtp_geo",
];

export type WhyNowResult = {
  /** Single Slack-ready why-now line (templated). */
  whyNow: string;
  /** Ordered template lines that contributed. */
  lines: string[];
  source: "templates" | "status";
};

function templateFor(key: string): string {
  const cfg = loadScoringConfig();
  return cfg.whyNow[key] ?? "";
}

export function whyNowFromBreakdown(
  breakdown: ScoreBreakdown,
  opts?: { status?: "below_threshold" | "suppressed" | "cooldown" },
): WhyNowResult {
  if (opts?.status) {
    const line = templateFor(opts.status) || opts.status;
    return { whyNow: line, lines: [line], source: "status" };
  }

  const lines: string[] = [];
  for (const id of FACTOR_ORDER) {
    if (typeof breakdown[id] !== "number" || breakdown[id]! <= 0) continue;
    const t = templateFor(id);
    if (t !== "") lines.push(t);
  }

  if (lines.length === 0) {
    const fallback = templateFor("below_threshold") || "No templated why-now factors.";
    return { whyNow: fallback, lines: [fallback], source: "status" };
  }

  // Lead with the strongest primary template; append up to 2 boosts briefly.
  const whyNow =
    lines.length === 1
      ? lines[0]
      : `${lines[0]} (+ ${lines.slice(1, 3).join("; ")})`;

  return { whyNow, lines, source: "templates" };
}

export function whyNowFromScore(
  score: ScoreResult,
  opts?: { status?: "below_threshold" | "suppressed" | "cooldown" },
): WhyNowResult {
  if (opts?.status) return whyNowFromBreakdown(score.breakdown, opts);
  if (!score.clearsThreshold) {
    return whyNowFromBreakdown(score.breakdown, { status: "below_threshold" });
  }
  return whyNowFromBreakdown(score.breakdown);
}
