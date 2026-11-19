/**
 * Config-driven AHP lead scoring (config/scoring.yaml).
 * Returns total + breakdown dict. Threshold default ~50.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type ScoreFactorId =
  | "facility_expansion"
  | "suite_qualification"
  | "shutdown_signal"
  | "cleanroom_validation"
  | "landlord_move"
  | "buyer_adjacent_hiring"
  | "intent_site_named"
  | "intent_paired"
  | "watchlist_priority"
  | "watchlist_competitor"
  | "rtp_geo"
  | "named_site";

export type ScoringConfig = {
  threshold: number;
  cooldownDays: number;
  scoreJumpRealert: number;
  maxScore: number;
  weights: Record<ScoreFactorId, number>;
  whyNow: Record<string, string>;
};

/** Defaults match config/scoring.yaml (Jacob can edit the YAML). */
export const DEFAULT_SCORING: ScoringConfig = {
  threshold: 50,
  cooldownDays: 14,
  scoreJumpRealert: 15,
  maxScore: 100,
  weights: {
    facility_expansion: 40,
    suite_qualification: 35,
    shutdown_signal: 40,
    cleanroom_validation: 35,
    landlord_move: 30,
    buyer_adjacent_hiring: 25,
    intent_site_named: 20,
    intent_paired: 15,
    watchlist_priority: 10,
    watchlist_competitor: 5,
    rtp_geo: 5,
    named_site: 10,
  },
  whyNow: {
    facility_expansion:
      "Facility expansion / new capacity at a named site — AHP window for 6-log decon + ~24h mobilize.",
    suite_qualification:
      "Suite qualification / commissioning at a named site — cleanroom adjacency for AHP.",
    shutdown_signal:
      "Shutdown / turnaround signal — high-value AHP shutdown job adjacency.",
    cleanroom_validation:
      "Cleanroom / validation work at a named site — AHP decon fit.",
    landlord_move:
      "Lab-landlord / suite move (Alexandria / Longfellow style) — new suite occupancy window.",
    buyer_adjacent_hiring:
      "Buyer-adjacent hire (sterile / QA / facilities / validation) at a named site.",
    intent_site_named:
      "Intent spike tied to a named manufacturing site/suite — supporting why-now only.",
    intent_paired:
      "Intent paired with a facility scoop — supporting evidence, not standalone noise.",
    watchlist_priority: "On your priority watchlist.",
    watchlist_competitor: "On your competitor watchlist.",
    rtp_geo: "RTP / Morrisville / Holly Springs geo bias.",
    named_site: "Named plant/suite (not HQ-only).",
    below_threshold: "Below score threshold — do not alert.",
    suppressed: "Suppressed — do not alert.",
    cooldown: "Inside cooldown for this company + signal type.",
  },
};

const PRIMARY_FACTORS: ScoreFactorId[] = [
  "facility_expansion",
  "suite_qualification",
  "shutdown_signal",
  "cleanroom_validation",
  "landlord_move",
  "buyer_adjacent_hiring",
  "intent_site_named",
  "intent_paired",
];

const BOOST_FACTORS: ScoreFactorId[] = [
  "watchlist_priority",
  "watchlist_competitor",
  "rtp_geo",
  "named_site",
];

export type LeadSignalInput = {
  /** Which primary + boost factors apply (true = include weight). */
  factors: Partial<Record<ScoreFactorId, boolean>>;
  /** Optional free-form signal_type label for dedup (e.g. facility_expansion). */
  signalType?: string;
};

export type ScoreBreakdown = Record<string, number>;

export type ScoreResult = {
  total: number;
  threshold: number;
  clearsThreshold: boolean;
  breakdown: ScoreBreakdown;
  /** Primary factor with the highest weight among those set (for why-now). */
  primaryFactor: ScoreFactorId | null;
  signalType: string;
  config: Pick<
    ScoringConfig,
    "cooldownDays" | "scoreJumpRealert" | "maxScore"
  >;
};

function configDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../config");
}

/**
 * Minimal YAML subset loader for scoring.yaml (top-level scalars + one nested map).
 * Avoids a hard dependency on js-yaml while keeping the file human-editable.
 */
export function parseScoringYaml(text: string): Partial<{
  threshold: number;
  cooldown_days: number;
  score_jump_realert: number;
  max_score: number;
  weights: Record<string, number>;
  why_now: Record<string, string>;
}> {
  const out: {
    threshold?: number;
    cooldown_days?: number;
    score_jump_realert?: number;
    max_score?: number;
    weights?: Record<string, number>;
    why_now?: Record<string, string>;
  } = {};
  let section: "weights" | "why_now" | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const sectionMatch = trimmed.match(/^(weights|why_now)\s*:\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1] as "weights" | "why_now";
      if (section === "weights") out.weights = out.weights ?? {};
      if (section === "why_now") out.why_now = out.why_now ?? {};
      continue;
    }

    const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (section && indent >= 2) {
      const m = trimmed.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (section === "weights") {
        const n = Number(val);
        if (Number.isFinite(n)) out.weights![key] = n;
      } else {
        out.why_now![key] = val;
      }
      continue;
    }

    section = null;
    const top = trimmed.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!top) continue;
    const key = top[1];
    const val = top[2].trim();
    const n = Number(val);
    if (key === "threshold" && Number.isFinite(n)) out.threshold = n;
    if (key === "cooldown_days" && Number.isFinite(n)) out.cooldown_days = n;
    if (key === "score_jump_realert" && Number.isFinite(n))
      out.score_jump_realert = n;
    if (key === "max_score" && Number.isFinite(n)) out.max_score = n;
  }

  return out;
}

function envNumber(name: string): number | undefined {
  const raw = (process.env[name] ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

let cached: ScoringConfig | null = null;

export function loadScoringConfig(forceReload = false): ScoringConfig {
  if (cached !== null && !forceReload) return cached;

  const base: ScoringConfig = {
    threshold: DEFAULT_SCORING.threshold,
    cooldownDays: DEFAULT_SCORING.cooldownDays,
    scoreJumpRealert: DEFAULT_SCORING.scoreJumpRealert,
    maxScore: DEFAULT_SCORING.maxScore,
    weights: { ...DEFAULT_SCORING.weights },
    whyNow: { ...DEFAULT_SCORING.whyNow },
  };

  const path = join(configDir(), "scoring.yaml");
  if (existsSync(path)) {
    try {
      const parsed = parseScoringYaml(readFileSync(path, "utf8"));
      if (typeof parsed.threshold === "number") base.threshold = parsed.threshold;
      if (typeof parsed.cooldown_days === "number")
        base.cooldownDays = parsed.cooldown_days;
      if (typeof parsed.score_jump_realert === "number")
        base.scoreJumpRealert = parsed.score_jump_realert;
      if (typeof parsed.max_score === "number") base.maxScore = parsed.max_score;
      if (parsed.weights) {
        for (const [k, v] of Object.entries(parsed.weights)) {
          if (k in base.weights && typeof v === "number") {
            base.weights[k as ScoreFactorId] = v;
          }
        }
      }
      if (parsed.why_now) {
        for (const [k, v] of Object.entries(parsed.why_now)) {
          if (typeof v === "string" && v.trim() !== "") base.whyNow[k] = v.trim();
        }
      }
    } catch {
      // Keep defaults if YAML is malformed.
    }
  }

  base.threshold = envNumber("SCOUT_SCORE_THRESHOLD") ?? base.threshold;
  base.cooldownDays = envNumber("SCOUT_COOLDOWN_DAYS") ?? base.cooldownDays;
  base.scoreJumpRealert =
    envNumber("SCOUT_SCORE_JUMP_REALERT") ?? base.scoreJumpRealert;

  cached = base;
  return base;
}

export function inferSignalType(factors: Partial<Record<ScoreFactorId, boolean>>): string {
  let best: ScoreFactorId | null = null;
  let bestW = -1;
  const cfg = loadScoringConfig();
  for (const id of PRIMARY_FACTORS) {
    if (!factors[id]) continue;
    const w = cfg.weights[id] ?? 0;
    if (w > bestW) {
      bestW = w;
      best = id;
    }
  }
  return best ?? "unknown";
}

export function scoreLead(input: LeadSignalInput): ScoreResult {
  const cfg = loadScoringConfig();
  const breakdown: ScoreBreakdown = {};
  let total = 0;

  for (const id of [...PRIMARY_FACTORS, ...BOOST_FACTORS]) {
    if (!input.factors[id]) continue;
    const w = cfg.weights[id] ?? 0;
    if (w === 0) continue;
    breakdown[id] = w;
    total += w;
  }

  total = Math.min(cfg.maxScore, total);
  const primaryFactor =
    (PRIMARY_FACTORS.filter((id) => input.factors[id]).sort(
      (a, b) => (cfg.weights[b] ?? 0) - (cfg.weights[a] ?? 0),
    )[0] as ScoreFactorId | undefined) ?? null;

  const signalType = (input.signalType ?? inferSignalType(input.factors)).trim() ||
    "unknown";

  return {
    total,
    threshold: cfg.threshold,
    clearsThreshold: total >= cfg.threshold,
    breakdown,
    primaryFactor,
    signalType,
    config: {
      cooldownDays: cfg.cooldownDays,
      scoreJumpRealert: cfg.scoreJumpRealert,
      maxScore: cfg.maxScore,
    },
  };
}
