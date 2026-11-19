/**
 * Durable suppression store (host.kv) + CSV seed.
 * Suppress company (optional signal_type) so digests skip re-alerts.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHostKvStore,
  normalizeKeyPart,
  type DurableJson,
  type DurableStore,
  type KvLike,
} from "./durable-store.ts";

export const SUPPRESSIONS_KV_KEY = "scout:suppressions";
export const SUPPRESSIONS_SEEDED_KV_KEY = "scout:suppressions:seeded";

export type SuppressionItem = {
  company: string;
  /** Empty / omit = company-wide suppress. */
  signalType?: string;
  reason: string;
  setAt: string;
  /** ISO; omit = no expiry. */
  expiresAt?: string;
};

export type SuppressionList = {
  items: SuppressionItem[];
  notes: string;
};

const DEFAULT_NOTES =
  "Companies / signal types Scout should not re-alert. Seed from config/suppression_seed.csv; edit via Slack (Suppress button or update_suppression).";

function emptyList(): SuppressionList {
  return { items: [], notes: DEFAULT_NOTES };
}

export function storeFromKv(kv: KvLike): DurableStore {
  return createHostKvStore(kv);
}

function parseList(raw: unknown): SuppressionList {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyList();
  }
  const o = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(o.items) ? o.items : [];
  const items: SuppressionItem[] = [];
  for (const row of itemsRaw) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const company = typeof r.company === "string" ? r.company.trim() : "";
    if (company === "") continue;
    const signalType =
      typeof r.signalType === "string" && r.signalType.trim() !== ""
        ? r.signalType.trim()
        : undefined;
    const reason = typeof r.reason === "string" ? r.reason : "";
    const setAt =
      typeof r.setAt === "string" ? r.setAt : new Date().toISOString();
    const expiresAt =
      typeof r.expiresAt === "string" && r.expiresAt.trim() !== ""
        ? r.expiresAt.trim()
        : undefined;
    items.push({
      company,
      ...(signalType !== undefined ? { signalType } : {}),
      reason,
      setAt,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    });
  }
  return {
    items,
    notes: typeof o.notes === "string" ? o.notes : DEFAULT_NOTES,
  };
}

function itemKey(company: string, signalType?: string): string {
  const c = normalizeKeyPart(company);
  const s =
    signalType && signalType.trim() !== ""
      ? normalizeKeyPart(signalType)
      : "*";
  return `${c}::${s}`;
}

function isExpired(item: SuppressionItem, now: Date): boolean {
  if (!item.expiresAt) return false;
  const t = Date.parse(item.expiresAt);
  return Number.isFinite(t) && t <= now.getTime();
}

export function matchSuppression(
  list: SuppressionList,
  company: string,
  signalType?: string,
  now = new Date(),
): SuppressionItem | null {
  const c = normalizeKeyPart(company);
  const s =
    signalType && signalType.trim() !== ""
      ? normalizeKeyPart(signalType)
      : "";
  let companyWide: SuppressionItem | null = null;
  for (const item of list.items) {
    if (isExpired(item, now)) continue;
    if (normalizeKeyPart(item.company) !== c) continue;
    if (!item.signalType || item.signalType.trim() === "") {
      companyWide = item;
      continue;
    }
    if (s !== "" && normalizeKeyPart(item.signalType) === s) {
      return item;
    }
  }
  return companyWide;
}

function seedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../config/suppression_seed.csv");
}

/** Tiny CSV parser: company,signal_type,reason,expires_at */
export function parseSuppressionCsv(text: string): SuppressionItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const start = /^company\s*,/i.test(lines[0]) ? 1 : 0;
  const now = new Date().toISOString();
  const items: SuppressionItem[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const company = (cols[0] ?? "").trim();
    if (company === "") continue;
    const signalType = (cols[1] ?? "").trim();
    const reason = (cols[2] ?? "").trim();
    const expiresAt = (cols[3] ?? "").trim();
    items.push({
      company,
      ...(signalType !== "" ? { signalType } : {}),
      reason: reason !== "" ? reason : "seed",
      setAt: now,
      ...(expiresAt !== "" ? { expiresAt } : {}),
    });
  }
  return items;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function loadSeedItems(): SuppressionItem[] {
  const path = seedPath();
  if (!existsSync(path)) return [];
  try {
    return parseSuppressionCsv(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

export async function loadSuppressions(store: DurableStore): Promise<SuppressionList> {
  return parseList(await store.get(SUPPRESSIONS_KV_KEY));
}

export async function saveSuppressions(
  store: DurableStore,
  list: SuppressionList,
): Promise<void> {
  const payload: DurableJson = {
    items: list.items.map((item) => ({
      company: item.company,
      ...(item.signalType ? { signalType: item.signalType } : {}),
      reason: item.reason,
      setAt: item.setAt,
      ...(item.expiresAt ? { expiresAt: item.expiresAt } : {}),
    })),
    notes: list.notes,
  };
  await store.put(SUPPRESSIONS_KV_KEY, payload);
}

/** Idempotent: merge CSV seed once per deployment kv. */
export async function ensureSuppressionSeed(
  store: DurableStore,
): Promise<{ seeded: boolean; added: number }> {
  const flag = await store.get(SUPPRESSIONS_SEEDED_KV_KEY);
  if (flag === true || (flag !== null && typeof flag === "object")) {
    return { seeded: false, added: 0 };
  }

  const list = await loadSuppressions(store);
  const existing = new Set(
    list.items.map((i) => itemKey(i.company, i.signalType)),
  );
  let added = 0;
  for (const seed of loadSeedItems()) {
    const k = itemKey(seed.company, seed.signalType);
    if (existing.has(k)) continue;
    list.items.push(seed);
    existing.add(k);
    added += 1;
  }
  await saveSuppressions(store, list);
  await store.put(SUPPRESSIONS_SEEDED_KV_KEY, {
    at: new Date().toISOString(),
    added,
  });
  return { seeded: true, added };
}

export async function addSuppression(
  store: DurableStore,
  input: {
    company: string;
    signalType?: string;
    reason?: string;
    expiresAt?: string;
  },
): Promise<SuppressionList> {
  await ensureSuppressionSeed(store);
  const list = await loadSuppressions(store);
  const company = input.company.trim();
  const signalType = input.signalType?.trim();
  const k = itemKey(company, signalType);
  list.items = list.items.filter(
    (i) => itemKey(i.company, i.signalType) !== k,
  );
  list.items.push({
    company,
    ...(signalType && signalType !== "" ? { signalType } : {}),
    reason: (input.reason ?? "suppressed from Slack").trim() || "suppressed",
    setAt: new Date().toISOString(),
    ...(input.expiresAt && input.expiresAt.trim() !== ""
      ? { expiresAt: input.expiresAt.trim() }
      : {}),
  });
  await saveSuppressions(store, list);
  return list;
}

export async function removeSuppression(
  store: DurableStore,
  company: string,
  signalType?: string,
): Promise<SuppressionList> {
  await ensureSuppressionSeed(store);
  const list = await loadSuppressions(store);
  const k = itemKey(company, signalType);
  if (signalType && signalType.trim() !== "") {
    list.items = list.items.filter(
      (i) => itemKey(i.company, i.signalType) !== k,
    );
  } else {
    // Company-wide remove: drop all rows for that company.
    const c = normalizeKeyPart(company);
    list.items = list.items.filter(
      (i) => normalizeKeyPart(i.company) !== c,
    );
  }
  await saveSuppressions(store, list);
  return list;
}

export async function isSuppressed(
  store: DurableStore,
  company: string,
  signalType?: string,
): Promise<{ suppressed: boolean; match: SuppressionItem | null }> {
  await ensureSuppressionSeed(store);
  const list = await loadSuppressions(store);
  const match = matchSuppression(list, company, signalType);
  return { suppressed: match !== null, match };
}
