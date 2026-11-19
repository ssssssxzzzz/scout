/**
 * Dedup / cooldown for company + signal_type (default 14d).
 * Configurable score-jump re-alert via scoring.yaml / env.
 */

import {
  createHostKvStore,
  normalizeKeyPart,
  type DurableStore,
  type KvLike,
} from "./durable-store.ts";
import { loadScoringConfig } from "./scoring.ts";

export const ALERT_KEY_PREFIX = "scout:alert:";

export type AlertRecord = {
  company: string;
  signalType: string;
  score: number;
  alertedAt: string;
  /** ISO expiry — past this, cooldown is over. */
  exp: string;
};

export type DedupDecision = {
  shouldAlert: boolean;
  reason:
    | "first_alert"
    | "cooldown_expired"
    | "score_jump"
    | "in_cooldown"
    | "invalid";
  prior: AlertRecord | null;
  cooldownDays: number;
  scoreJumpRealert: number;
  key: string;
};

export function alertKey(company: string, signalType: string): string {
  return `${ALERT_KEY_PREFIX}${normalizeKeyPart(company)}:${normalizeKeyPart(signalType)}`;
}

function parseAlert(raw: unknown): AlertRecord | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const company = typeof o.company === "string" ? o.company : "";
  const signalType = typeof o.signalType === "string" ? o.signalType : "";
  const score = typeof o.score === "number" ? o.score : NaN;
  const alertedAt = typeof o.alertedAt === "string" ? o.alertedAt : "";
  const exp = typeof o.exp === "string" ? o.exp : "";
  if (company === "" || signalType === "" || !Number.isFinite(score) || alertedAt === "") {
    return null;
  }
  return { company, signalType, score, alertedAt, exp };
}

export function storeFromKv(kv: KvLike): DurableStore {
  return createHostKvStore(kv);
}

export async function checkAlertDedup(
  store: DurableStore,
  company: string,
  signalType: string,
  newScore: number,
  now = new Date(),
): Promise<DedupDecision> {
  const cfg = loadScoringConfig();
  const key = alertKey(company, signalType);
  const companyTrim = company.trim();
  const signalTrim = signalType.trim();
  if (companyTrim === "" || signalTrim === "") {
    return {
      shouldAlert: false,
      reason: "invalid",
      prior: null,
      cooldownDays: cfg.cooldownDays,
      scoreJumpRealert: cfg.scoreJumpRealert,
      key,
    };
  }

  const prior = parseAlert(await store.get(key));
  if (prior === null) {
    return {
      shouldAlert: true,
      reason: "first_alert",
      prior: null,
      cooldownDays: cfg.cooldownDays,
      scoreJumpRealert: cfg.scoreJumpRealert,
      key,
    };
  }

  const expMs = Date.parse(prior.exp);
  if (!Number.isFinite(expMs) || expMs <= now.getTime()) {
    return {
      shouldAlert: true,
      reason: "cooldown_expired",
      prior,
      cooldownDays: cfg.cooldownDays,
      scoreJumpRealert: cfg.scoreJumpRealert,
      key,
    };
  }

  if (newScore >= prior.score + cfg.scoreJumpRealert) {
    return {
      shouldAlert: true,
      reason: "score_jump",
      prior,
      cooldownDays: cfg.cooldownDays,
      scoreJumpRealert: cfg.scoreJumpRealert,
      key,
    };
  }

  return {
    shouldAlert: false,
    reason: "in_cooldown",
    prior,
    cooldownDays: cfg.cooldownDays,
    scoreJumpRealert: cfg.scoreJumpRealert,
    key,
  };
}

export async function recordAlert(
  store: DurableStore,
  company: string,
  signalType: string,
  score: number,
  now = new Date(),
): Promise<AlertRecord> {
  const cfg = loadScoringConfig();
  const exp = new Date(now.getTime() + cfg.cooldownDays * 24 * 60 * 60 * 1000);
  const record: AlertRecord = {
    company: company.trim(),
    signalType: signalType.trim(),
    score,
    alertedAt: now.toISOString(),
    exp: exp.toISOString(),
  };
  await store.put(alertKey(company, signalType), record);
  return record;
}
