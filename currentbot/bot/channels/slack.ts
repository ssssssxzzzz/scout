import {
  blockActionAuth,
  slackChannel,
  type SlackBlockAction,
  type SlackBinding,
  type SlackDispatchDecision,
} from "@grok/agent-sdk/channels/slack";
import { ACT_ACTION, isActActionId } from "../lib/act-cards.ts";
import { mobileMenuInbound, onMobileMenuAction } from "../lib/mobile-menu.ts";

/**
 * Slack channel for the Cursor-hosted deployment.
 *
 * The control plane delivers mentions, DMs, and Block Kit clicks
 * (`block_actions`). Phone Slack gets the 1–6 menu as buttons. Act cards
 * add Prep me / Mute this / Add to watchlist / Suppress. Tool-approval
 * clicks resolve before these handlers. Desktop still has up to four
 * suggested-prompt chips. Slash commands are not used (Block Kit + tools).
 */
async function resolveActCardNote(
  ctx: SlackBinding,
  action: SlackBlockAction,
  note: string,
): Promise<void> {
  if (action.messageBlocks === undefined) return;
  try {
    const client = await ctx.host.slack.getClient();
    const remaining = action.messageBlocks.filter((block) => {
      if (typeof block !== "object" || block === null) return true;
      const b = block as { type?: string; block_id?: string };
      return !(b.type === "actions" && b.block_id === action.blockId);
    });
    await client.chat.update({
      channel: action.channelId,
      ts: action.messageTs,
      text: note,
      // Slack WebClient Block Kit types are stricter than runtime payloads.
      blocks: [
        ...remaining,
        { type: "context", elements: [{ type: "mrkdwn", text: note }] },
      ] as never,
    });
  } catch {
    // Soft: the dispatched turn is the durable record.
  }
}

async function onActCardAction(
  ctx: SlackBinding,
  action: SlackBlockAction,
): Promise<SlackDispatchDecision | null> {
  if (!isActActionId(action.actionId)) {
    return null;
  }
  const company = action.value.trim();
  if (company === "") {
    return null;
  }

  if (action.actionId === ACT_ACTION.prep) {
    await resolveActCardNote(ctx, action, `Prep me · ${company}`);
    return {
      auth: blockActionAuth(action),
      message: `User tapped Prep me for "${company}". Run playbook 5 now for that company only: short firmographics + latest facility/ops/QA scoops + facilities/QA/ops contacts only (no generic HR/sales). Each signal line ends with Why this matters for AHP. Do not open ZoomInfo website links as the answer — Slack only.`,
    };
  }

  if (action.actionId === ACT_ACTION.mute) {
    await resolveActCardNote(ctx, action, `Muted · ${company}`);
    return {
      auth: blockActionAuth(action),
      message: `User tapped Mute this for "${company}". Call update_mute_list with action=add and term="${company}". Confirm in one short Slack line. Do not run a new scan.`,
    };
  }

  if (action.actionId === ACT_ACTION.suppress) {
    await resolveActCardNote(ctx, action, `Suppressed · ${company}`);
    return {
      auth: blockActionAuth(action),
      message: `User tapped Suppress for "${company}". Call update_suppression with action=add and company="${company}" (company-wide). Confirm in one short Slack line. Do not run a new scan.`,
    };
  }

  await resolveActCardNote(ctx, action, `Watchlist · ${company}`);
  return {
    auth: blockActionAuth(action),
    message: `User tapped Add to watchlist for "${company}". Call update_watchlist with lane=priority, action=add, and name="${company}". Confirm in one short Slack line. Do not run a new scan.`,
  };
}

export default slackChannel({
  envPrefix: "ZOOMINFO_BRIEF",
  // Posts the ZoomInfo OAuth Connect card in Slack. Without it the call fails closed.
  toolApprovals: true,
  onAppMention: mobileMenuInbound(),
  onDirectMessage: mobileMenuInbound(),
  async onBlockAction(ctx, action) {
    const menu = await onMobileMenuAction(ctx, action);
    if (menu !== null) {
      return menu;
    }
    return onActCardAction(ctx, action);
  },
  suggestedPromptsTitle: "What do you want?",
  suggestedPrompts: [
    { title: "Menu", message: "help" },
    {
      title: "Digests here",
      message: "send morning digests here",
    },
    {
      title: "Weekly brief",
      message: "6 — Weekly ranked brief (NC)",
    },
    {
      title: "Prep account",
      message: "5 — Prep one named account (tell me which)",
    },
  ],
});
