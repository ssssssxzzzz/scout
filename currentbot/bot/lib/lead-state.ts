/**
 * Lightweight durable lead status (claim / contacted / outcomes).
 * host.kv only — not SQLite / stateRoot.
 */

import {
  createHostKvStore,
  normalizeKeyPart,
  type DurableJson,
  type DurableStore,
  type KvLike,
} from "./durable-store.ts";
import type { SignalLane } from "./channel-map.ts";

export const LEAD_KEY_PREFIX = "scout:lead:";
export const LEAD_DAY_PREFIX = "scout:lead-day:";

export type LeadStatus =
  | "new"
  | "claimed"
  | "contacted"
  | "not_fit"
  | "suppressed"
  | "won"
  | "lost";

export type LeadRecord = {
  company: string;
  signalType: string;
  lane: SignalLane;
  status: LeadStatus;
  ownerSlackId?: string;
  ownerName?: string;
  reason?: string;
  channelId?: string;
  messageTs?: string;
  updatedAt: string;
  /** ISO expiry when status carries a TTL (e.g. not_fit 90d). */
  exp?: string;
};

export type ClaimResult = {
  ok: boolean;
  idempotent: boolean;
  record: LeadRecord;
  reason?:
    | "claimed"
    | "already_yours"
    | "owned_by_other"
    | "terminal"
    | "invalid";
  priorOwner?: string;
};

export type OutcomeResult = {
  ok: boolean;
  idempotent: boolean;
  record: LeadRecord;
  reason?: string;
};

const TERMINAL: ReadonlySet<LeadStatus> = new Set([
  "won",
  "lost",
  "not_fit",
  "suppressed",
]);

export function storeFromKv(kv: KvLike): DurableStore {
  return createHostKvStore(kv);
}

export function leadKey(company: string, signalType = "*"): string {
  return `${LEAD_KEY_PREFIX}${normalizeKeyPart(company)}:${normalizeKeyPart(signalType || "*")}`;
}

export function leadDayKey(company: string, day = utcDay()): string {
  return `${LEAD_DAY_PREFIX}${day}:${normalizeKeyPart(company)}`;
}

export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function parseLead(raw: unknown): LeadRecord | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const company = typeof o.company === "string" ? o.company.trim() : "";
  if (company === "") return null;
  const signalType =
    typeof o.signalType === "string" && o.signalType.trim() !== ""
      ? o.signalType.trim()
      : "unknown";
  const lane =
    typeof o.lane === "string" && o.lane.trim() !== ""
      ? (o.lane.trim() as SignalLane)
      : "facility_events";
  const status =
    typeof o.status === "string" ? (o.status as LeadStatus) : "new";
  const updatedAt =
    typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString();
  return {
    company,
    signalType,
    lane,
    status,
    ...(typeof o.ownerSlackId === "string" && o.ownerSlackId.trim() !== ""
      ? { ownerSlackId: o.ownerSlackId.trim() }
      : {}),
    ...(typeof o.ownerName === "string" && o.ownerName.trim() !== ""
      ? { ownerName: o.ownerName.trim() }
      : {}),
    ...(typeof o.reason === "string" && o.reason.trim() !== ""
      ? { reason: o.reason.trim() }
      : {}),
    ...(typeof o.channelId === "string" && o.channelId.trim() !== ""
      ? { channelId: o.channelId.trim() }
      : {}),
    ...(typeof o.messageTs === "string" && o.messageTs.trim() !== ""
      ? { messageTs: o.messageTs.trim() }
      : {}),
    updatedAt,
    ...(typeof o.exp === "string" && o.exp.trim() !== ""
      ? { exp: o.exp.trim() }
      : {}),
  };
}

function toJson(record: LeadRecord): DurableJson {
  return {
    company: record.company,
    signalType: record.signalType,
    lane: record.lane,
    status: record.status,
    ...(record.ownerSlackId ? { ownerSlackId: record.ownerSlackId } : {}),
    ...(record.ownerName ? { ownerName: record.ownerName } : {}),
    ...(record.reason ? { reason: record.reason } : {}),
    ...(record.channelId ? { channelId: record.channelId } : {}),
    ...(record.messageTs ? { messageTs: record.messageTs } : {}),
    updatedAt: record.updatedAt,
    ...(record.exp ? { exp: record.exp } : {}),
  };
}

export async function loadLead(
  store: DurableStore,
  company: string,
  signalType = "*",
): Promise<LeadRecord | null> {
  return parseLead(await store.get(leadKey(company, signalType)));
}

export async function saveLead(
  store: DurableStore,
  record: LeadRecord,
): Promise<void> {
  await store.put(leadKey(record.company, record.signalType), toJson(record));
  // Also mirror under company-wide key for NL lookups when signal is unknown.
  if (record.signalType !== "*") {
    await store.put(leadKey(record.company, "*"), toJson(record));
  }
}

export async function ensureLead(
  store: DurableStore,
  input: {
    company: string;
    signalType?: string;
    lane?: SignalLane;
    channelId?: string;
    messageTs?: string;
  },
): Promise<LeadRecord> {
  const signalType = (input.signalType ?? "*").trim() || "*";
  const existing =
    (await loadLead(store, input.company, signalType)) ??
    (signalType !== "*"
      ? await loadLead(store, input.company, "*")
      : null);
  if (existing) {
    const merged: LeadRecord = {
      ...existing,
      signalType:
        signalType !== "*" ? signalType : existing.signalType,
      lane: input.lane ?? existing.lane,
      channelId: input.channelId ?? existing.channelId,
      messageTs: input.messageTs ?? existing.messageTs,
      updatedAt: new Date().toISOString(),
    };
    await saveLead(store, merged);
    return merged;
  }
  const record: LeadRecord = {
    company: input.company.trim(),
    signalType,
    lane: input.lane ?? "facility_events",
    status: "new",
    updatedAt: new Date().toISOString(),
    ...(input.channelId ? { channelId: input.channelId } : {}),
    ...(input.messageTs ? { messageTs: input.messageTs } : {}),
  };
  await saveLead(store, record);
  return record;
}

/**
 * Claim a lead. Idempotent when the same Slack user already owns it.
 */
export async function claimLead(
  store: DurableStore,
  input: {
    company: string;
    signalType?: string;
    ownerSlackId: string;
    ownerName?: string;
    lane?: SignalLane;
    channelId?: string;
    messageTs?: string;
  },
): Promise<ClaimResult> {
  const owner = input.ownerSlackId.trim();
  if (owner === "" || input.company.trim() === "") {
    const invalid: LeadRecord = {
      company: input.company.trim() || "unknown",
      signalType: input.signalType?.trim() || "*",
      lane: input.lane ?? "facility_events",
      status: "new",
      updatedAt: new Date().toISOString(),
    };
    return { ok: false, idempotent: false, record: invalid, reason: "invalid" };
  }

  const current = await ensureLead(store, input);

  if (TERMINAL.has(current.status)) {
    return {
      ok: false,
      idempotent: true,
      record: current,
      reason: "terminal",
    };
  }

  if (
    (current.status === "claimed" || current.status === "contacted") &&
    current.ownerSlackId
  ) {
    if (current.ownerSlackId === owner) {
      return {
        ok: true,
        idempotent: true,
        record: current,
        reason: "already_yours",
      };
    }
    return {
      ok: false,
      idempotent: true,
      record: current,
      reason: "owned_by_other",
      priorOwner: current.ownerSlackId,
    };
  }

  const record: LeadRecord = {
    ...current,
    status: "claimed",
    ownerSlackId: owner,
    ...(input.ownerName?.trim()
      ? { ownerName: input.ownerName.trim() }
      : current.ownerName
        ? { ownerName: current.ownerName }
        : {}),
    ...(input.channelId ? { channelId: input.channelId } : {}),
    ...(input.messageTs ? { messageTs: input.messageTs } : {}),
    updatedAt: new Date().toISOString(),
  };
  await saveLead(store, record);
  return { ok: true, idempotent: false, record, reason: "claimed" };
}

export async function markContacted(
  store: DurableStore,
  input: {
    company: string;
    signalType?: string;
    ownerSlackId?: string;
    ownerName?: string;
    channelId?: string;
    messageTs?: string;
  },
): Promise<OutcomeResult> {
  const current = await ensureLead(store, input);
  const owner = input.ownerSlackId?.trim() || "";

  if (TERMINAL.has(current.status)) {
    return {
      ok: false,
      idempotent: true,
      record: current,
      reason: `terminal:${current.status}`,
    };
  }

  if (current.status === "contacted") {
    const sameOwner =
      owner === "" ||
      !current.ownerSlackId ||
      current.ownerSlackId === owner;
    if (sameOwner) {
      return { ok: true, idempotent: true, record: current };
    }
    return {
      ok: false,
      idempotent: true,
      record: current,
      reason: "owned_by_other",
    };
  }

  // Claimed by someone else — do not steal via Contacted.
  if (
    current.status === "claimed" &&
    current.ownerSlackId &&
    owner !== "" &&
    current.ownerSlackId !== owner
  ) {
    return {
      ok: false,
      idempotent: true,
      record: current,
      reason: "owned_by_other",
    };
  }

  const record: LeadRecord = {
    ...current,
    status: "contacted",
    ownerSlackId: owner || current.ownerSlackId || undefined,
    ownerName: input.ownerName?.trim() || current.ownerName,
    ...(input.channelId ? { channelId: input.channelId } : {}),
    ...(input.messageTs ? { messageTs: input.messageTs } : {}),
    updatedAt: new Date().toISOString(),
  };
  await saveLead(store, record);
  return { ok: true, idempotent: false, record };
}

export async function markOutcome(
  store: DurableStore,
  input: {
    company: string;
    signalType?: string;
    status: "won" | "lost" | "not_fit" | "suppressed";
    ownerSlackId?: string;
    ownerName?: string;
    reason?: string;
    expDays?: number;
    channelId?: string;
    messageTs?: string;
  },
): Promise<OutcomeResult> {
  const current = await ensureLead(store, input);
  if (current.status === input.status) {
    const sameReason =
      (input.reason ?? "") === (current.reason ?? "") ||
      input.reason === undefined;
    if (sameReason) {
      return { ok: true, idempotent: true, record: current };
    }
  }

  const expDays = input.expDays;
  const exp =
    typeof expDays === "number" && expDays > 0
      ? new Date(Date.now() + expDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

  const record: LeadRecord = {
    ...current,
    status: input.status,
    ownerSlackId:
      input.ownerSlackId?.trim() || current.ownerSlackId || undefined,
    ownerName: input.ownerName?.trim() || current.ownerName,
    reason: input.reason?.trim() || current.reason,
    ...(input.channelId ? { channelId: input.channelId } : {}),
    ...(input.messageTs ? { messageTs: input.messageTs } : {}),
    updatedAt: new Date().toISOString(),
    ...(exp ? { exp } : {}),
  };
  await saveLead(store, record);
  return { ok: true, idempotent: false, record };
}

/** Same-company within the UTC day — Phase 2 fan-out dedupe. */
export async function checkDayDedupe(
  store: DurableStore,
  company: string,
  now = new Date(),
): Promise<{ duplicate: boolean; key: string }> {
  const key = leadDayKey(company, utcDay(now));
  const raw = await store.get(key);
  return { duplicate: raw !== undefined && raw !== null, key };
}

export async function recordDayPost(
  store: DurableStore,
  company: string,
  meta: { lane: SignalLane; channelId: string; messageTs?: string },
  now = new Date(),
): Promise<void> {
  const key = leadDayKey(company, utcDay(now));
  await store.put(key, {
    company: company.trim(),
    lane: meta.lane,
    channelId: meta.channelId,
    ...(meta.messageTs ? { messageTs: meta.messageTs } : {}),
    at: now.toISOString(),
    exp: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
  });
}
