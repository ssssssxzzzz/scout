import {
  slackChannel,
} from "@grok/agent-sdk/channels/slack";
import { onActCardAction } from "../lib/act-card-actions.ts";
import { mobileMenuInbound, onMobileMenuAction } from "../lib/mobile-menu.ts";

/**
 * Slack channel for the Cursor-hosted deployment.
 *
 * The control plane delivers mentions, DMs, and Block Kit clicks
 * (`block_actions`). Phone Slack gets the 1–6 menu as buttons. Act cards
 * add Claim / Contacted / Not a fit / Suppress plus Prep / Mute / Watchlist.
 * Not-a-fit uses an in-message reason picker (Agent SDK has no view_submission
 * hook). Tool-approval clicks resolve before these handlers. Desktop still
 * has up to four suggested-prompt chips. Slash commands are not used
 * (Block Kit + outcome tools for won/lost).
 */
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
