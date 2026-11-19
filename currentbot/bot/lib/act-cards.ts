/** Block Kit builders for AHP act cards (claim / outcome / prep / mute / watch / suppress). */

import type { SignalLane } from "./channel-map.ts";

export const ACT_ACTION = {
  prep: "scout_prep",
  mute: "scout_mute",
  watch: "scout_watch",
  suppress: "scout_suppress",
  claim: "scout_claim",
  contacted: "scout_contacted",
  notFit: "scout_not_fit",
  notFitReason: "scout_not_fit_reason",
} as const;

export type ActActionId = (typeof ACT_ACTION)[keyof typeof ACT_ACTION];

export const NOT_FIT_REASONS = [
  { id: "wrong_industry", label: "Wrong industry" },
  { id: "already_covered", label: "Already covered" },
  { id: "too_early", label: "Too early" },
  { id: "not_ahp", label: "Not AHP fit" },
  { id: "other", label: "Other" },
] as const;

export type NotFitReasonId = (typeof NOT_FIT_REASONS)[number]["id"];

export type ActCardInput = {
  /** Company / account name — also the button value payload. */
  company: string;
  /** Short observed signal + date. */
  signal: string;
  /** Why this matters for AHP (6-log / 24h mobilize / shutdown). */
  whyAhp: string;
  /** Optional next step line. */
  nextStep?: string;
  /** Optional site / geo line. */
  site?: string;
  /** Rank label, e.g. "1" or "Morning #2". */
  rank?: string;
  /** Scoring / dedup signal type (e.g. facility_expansion). */
  signalType?: string;
  /** Routing lane override. */
  lane?: SignalLane;
};

/** Compact button value so claim/outcome handlers recover company + signal. */
export type ActCardValue = {
  c: string;
  s?: string;
  l?: SignalLane;
  r?: string;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function encodeActCardValue(input: {
  company: string;
  signalType?: string;
  lane?: SignalLane;
  reason?: string;
}): string {
  const payload: ActCardValue = {
    c: truncate(input.company, 120),
  };
  if (input.signalType && input.signalType.trim() !== "") {
    payload.s = truncate(input.signalType.trim(), 40);
  }
  if (input.lane) payload.l = input.lane;
  if (input.reason && input.reason.trim() !== "") {
    payload.r = truncate(input.reason.trim(), 40);
  }
  const json = JSON.stringify(payload);
  if (json.length <= 1900) return json;
  // Fallback: company only.
  return truncate(input.company, 200);
}

export function decodeActCardValue(raw: string): ActCardValue {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as ActCardValue;
      if (typeof parsed.c === "string" && parsed.c.trim() !== "") {
        return {
          c: parsed.c.trim(),
          ...(typeof parsed.s === "string" ? { s: parsed.s } : {}),
          ...(typeof parsed.l === "string" ? { l: parsed.l } : {}),
          ...(typeof parsed.r === "string" ? { r: parsed.r } : {}),
        };
      }
    } catch {
      // fall through
    }
  }
  return { c: truncate(trimmed, 200) };
}

/** @deprecated Prefer encodeActCardValue — kept for callers that only have a name. */
export function actCardValue(company: string): string {
  return encodeActCardValue({ company });
}

export function isActActionId(actionId: string): actionId is ActActionId {
  return (
    actionId === ACT_ACTION.prep ||
    actionId === ACT_ACTION.mute ||
    actionId === ACT_ACTION.watch ||
    actionId === ACT_ACTION.suppress ||
    actionId === ACT_ACTION.claim ||
    actionId === ACT_ACTION.contacted ||
    actionId === ACT_ACTION.notFit ||
    actionId === ACT_ACTION.notFitReason
  );
}

export function isNotFitReasonId(id: string): id is NotFitReasonId {
  return NOT_FIT_REASONS.some((r) => r.id === id);
}

/** Loose Block Kit shape — Slack WebClient accepts this at runtime. */
export type SlackBlock = Record<string, unknown>;

function companySlug(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function cardBody(card: ActCardInput): string {
  const company = truncate(card.company, 120);
  const rank = card.rank ? `*${truncate(card.rank, 24)}.* ` : "";
  const site = card.site ? ` · ${truncate(card.site, 80)}` : "";
  const next = card.nextStep
    ? `\n*Next:* ${truncate(card.nextStep, 280)}`
    : "";
  const lane =
    card.lane || card.signalType
      ? `\n*Lane:* ${truncate(card.lane ?? card.signalType ?? "", 40)}`
      : "";
  return [
    `${rank}*${company}*${site}${lane}`,
    `*Observed:* ${truncate(card.signal, 500)}`,
    `*Why this matters for AHP:* ${truncate(card.whyAhp, 500)}${next}`,
  ].join("\n");
}

/**
 * One act card: section text + claim/outcome row + prep/mute/watch row.
 */
export function buildActCardBlocks(card: ActCardInput): SlackBlock[] {
  const company = truncate(card.company, 120);
  const value = encodeActCardValue({
    company,
    signalType: card.signalType,
    lane: card.lane,
  });
  const blockId = `scout_act_${companySlug(company)}_${Date.now().toString(36)}`;

  return [
    {
      type: "section",
      block_id: `scout_sec_${companySlug(company)}`,
      text: { type: "mrkdwn", text: truncate(cardBody(card), 2900) },
    },
    {
      type: "actions",
      block_id: `${blockId}_own`,
      elements: [
        {
          type: "button",
          action_id: ACT_ACTION.claim,
          text: { type: "plain_text", text: "Claim", emoji: false },
          style: "primary",
          value,
        },
        {
          type: "button",
          action_id: ACT_ACTION.contacted,
          text: { type: "plain_text", text: "Contacted", emoji: false },
          value,
        },
        {
          type: "button",
          action_id: ACT_ACTION.notFit,
          text: { type: "plain_text", text: "Not a fit", emoji: false },
          value,
        },
        {
          type: "button",
          action_id: ACT_ACTION.suppress,
          text: { type: "plain_text", text: "Suppress", emoji: false },
          value,
        },
      ],
    },
    {
      type: "actions",
      block_id: `${blockId}_tools`,
      elements: [
        {
          type: "button",
          action_id: ACT_ACTION.prep,
          text: { type: "plain_text", text: "Prep me", emoji: false },
          value,
        },
        {
          type: "button",
          action_id: ACT_ACTION.mute,
          text: { type: "plain_text", text: "Mute this", emoji: false },
          value,
        },
        {
          type: "button",
          action_id: ACT_ACTION.watch,
          text: { type: "plain_text", text: "Add to watchlist", emoji: false },
          value,
        },
      ],
    },
  ];
}

/**
 * In-message "modal": reason picker for Not a fit → 90d suppress.
 * Agent SDK does not first-class Slack view_submission; this stays on block_actions.
 */
export function buildNotFitReasonBlocks(card: {
  company: string;
  signalType?: string;
  lane?: SignalLane;
  bodyText?: string;
}): SlackBlock[] {
  const company = truncate(card.company, 120);
  const blockId = `scout_notfit_${companySlug(company)}_${Date.now().toString(36)}`;
  const elements = NOT_FIT_REASONS.map((reason) => ({
    type: "button",
    action_id: ACT_ACTION.notFitReason,
    text: { type: "plain_text", text: reason.label, emoji: false },
    value: encodeActCardValue({
      company,
      signalType: card.signalType,
      lane: card.lane,
      reason: reason.id,
    }),
  }));

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncate(
          card.bodyText ??
            `*Not a fit · ${company}*\nPick a reason (suppresses alerts for **90 days**).`,
          2900,
        ),
      },
    },
    {
      type: "actions",
      block_id: blockId,
      elements,
    },
  ];
}

/**
 * Final status card — no action rows (idempotent resolution).
 */
export function buildResolvedActCardBlocks(args: {
  bodyText: string;
  statusNote: string;
}): SlackBlock[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: truncate(args.bodyText, 2900) },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: truncate(args.statusNote, 2000) }],
    },
  ];
}

/** Keep section text when resolving; drop actions rows. */
export function sectionTextFromBlocks(blocks: unknown[] | undefined): string {
  if (!Array.isArray(blocks)) return "";
  for (const block of blocks) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as {
      type?: string;
      text?: { type?: string; text?: string };
    };
    if (b.type === "section" && typeof b.text?.text === "string") {
      return b.text.text;
    }
  }
  return "";
}

export function actCardFallbackText(card: ActCardInput): string {
  const rank = card.rank ? `${card.rank}. ` : "";
  return `${rank}${card.company} — ${card.signal} — Why AHP: ${card.whyAhp}`;
}
