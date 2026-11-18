import {
  blockActionAuth,
  createDefaultOnInbound,
  type SlackBlockAction,
  type SlackBinding,
  type SlackDispatchDecision,
  type SlackMessageHandler,
} from "@grok/agent-sdk/channels/slack";

/**
 * Phone Slack does not show assistant suggested-prompt chips. These Block Kit
 * buttons are the same 1–6 menu, posted on help / hi / vague asks.
 * Action ids stay off the tool-approval ids (`agent_serve_*`).
 */
export const MOBILE_MENU_ITEMS = [
  {
    id: "zoominfo_menu_1",
    label: "1. Facility moves",
    message: "1 — Facility moves / expansions (NC, three feeds)",
  },
  {
    id: "zoominfo_menu_2",
    label: "2. Competitor moves",
    message: "2 — Competitor moves",
  },
  {
    id: "zoominfo_menu_3",
    label: "3. Priority accounts",
    message: "3 — Priority account pulse",
  },
  {
    id: "zoominfo_menu_4",
    label: "4. Intent spikes",
    message: "4 — Intent spikes (sterile / aseptic / decontamination-adjacent)",
  },
  {
    id: "zoominfo_menu_5",
    label: "5. Prep account",
    message: "5 — Prep one named account (tell me which)",
  },
  {
    id: "zoominfo_menu_6",
    label: "6. Weekly brief",
    message: "6 — Weekly ranked brief (NC)",
  },
] as const;

const MENU_ASK =
  /^(?:help|menu|show menu|open menu|hi|hello|hey|yo|brief me|status|what can you do|what do you do|what do you want)\s*[!.?]*$/i;

const byId = new Map(MOBILE_MENU_ITEMS.map((item) => [item.id, item]));

export function plainAsk(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/gi, " ")
    .replace(/^@\S+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Help, hi, and other no-target asks. A numbered playbook pick stays a pick. */
export function wantsMobileMenu(text: string): boolean {
  const ask = plainAsk(text);
  return ask.length === 0 || MENU_ASK.test(ask);
}

export function mobileMenuBlocks(): unknown[] {
  const buttons = MOBILE_MENU_ITEMS.map((item) => ({
    type: "button",
    action_id: item.id,
    value: item.message,
    text: { type: "plain_text", text: item.label, emoji: true },
  }));
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*What do you want?*\nTap a playbook.",
      },
    },
    {
      type: "actions",
      block_id: "zoominfo_menu_row_1",
      elements: buttons.slice(0, 3),
    },
    {
      type: "actions",
      block_id: "zoominfo_menu_row_2",
      elements: buttons.slice(3),
    },
  ];
}

const FALLBACK_TEXT = [
  "What do you want?",
  ...MOBILE_MENU_ITEMS.map((item) => item.label),
].join("\n");

/** Post the button card, then keep the normal mention/DM turn (numbered text menu). */
export function withMobileMenu(handler: SlackMessageHandler): SlackMessageHandler {
  return async (ctx, message) => {
    const decision = await handler(ctx, message);
    if (decision != null && wantsMobileMenu(message.markdown || message.text)) {
      try {
        await ctx.thread.post(FALLBACK_TEXT, { blocks: mobileMenuBlocks() });
      } catch {
        // The numbered text menu still covers the thread.
      }
    }
    return decision;
  };
}

export function mobileMenuInbound(): SlackMessageHandler {
  return withMobileMenu(createDefaultOnInbound());
}

export async function onMobileMenuAction(
  ctx: SlackBinding,
  action: SlackBlockAction,
): Promise<SlackDispatchDecision | null> {
  const item = byId.get(action.actionId as (typeof MOBILE_MENU_ITEMS)[number]["id"]);
  if (item === undefined) {
    return null;
  }
  try {
    await ctx.thread.startTyping("Thinking…");
  } catch {
    // The turn still runs.
  }
  return {
    auth: blockActionAuth(action),
    message: action.value || item.message,
  };
}
