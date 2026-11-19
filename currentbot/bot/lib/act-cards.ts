/** Block Kit builders for AHP act cards (Prep / Mute / Watchlist). */

export const ACT_ACTION = {
  prep: "scout_prep",
  mute: "scout_mute",
  watch: "scout_watch",
  suppress: "scout_suppress",
} as const;

export type ActActionId = (typeof ACT_ACTION)[keyof typeof ACT_ACTION];

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
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Slack button value max is 2000; keep company names short. */
export function actCardValue(company: string): string {
  return truncate(company, 200);
}

export function isActActionId(actionId: string): actionId is ActActionId {
  return (
    actionId === ACT_ACTION.prep ||
    actionId === ACT_ACTION.mute ||
    actionId === ACT_ACTION.watch ||
    actionId === ACT_ACTION.suppress
  );
}

/** Loose Block Kit shape — Slack WebClient accepts this at runtime. */
export type SlackBlock = Record<string, unknown>;

/**
 * One act card: section text + actions row with Prep / Mute / Watchlist / Suppress.
 */
export function buildActCardBlocks(card: ActCardInput): SlackBlock[] {
  const company = truncate(card.company, 120);
  const value = actCardValue(company);
  const rank = card.rank ? `*${truncate(card.rank, 24)}.* ` : "";
  const site = card.site ? ` · ${truncate(card.site, 80)}` : "";
  const next = card.nextStep
    ? `\n*Next:* ${truncate(card.nextStep, 280)}`
    : "";

  const body = [
    `${rank}*${company}*${site}`,
    `*Observed:* ${truncate(card.signal, 500)}`,
    `*Why this matters for AHP:* ${truncate(card.whyAhp, 500)}${next}`,
  ].join("\n");

  const blockId = `scout_act_${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40)}_${Date.now().toString(36)}`;

  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: truncate(body, 2900) },
    },
    {
      type: "actions",
      block_id: blockId,
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
        {
          type: "button",
          action_id: ACT_ACTION.suppress,
          text: { type: "plain_text", text: "Suppress", emoji: false },
          value,
        },
      ],
    },
  ];
}

export function actCardFallbackText(card: ActCardInput): string {
  const rank = card.rank ? `${card.rank}. ` : "";
  return `${rank}${card.company} — ${card.signal} — Why AHP: ${card.whyAhp}`;
}
