import { slackChannel } from "@grok/agent-sdk/channels/slack";
import { mobileMenuInbound, onMobileMenuAction } from "./mobile-menu.ts";

/**
 * Slack channel for the Cursor-hosted deployment.
 *
 * The control plane delivers mentions, DMs, and Block Kit clicks
 * (`block_actions`). Phone Slack gets the 1–6 menu as buttons. A click
 * dispatches that playbook. Desktop still has up to four suggested-prompt chips.
 * Tool-approval clicks resolve before this menu handler.
 */
export default slackChannel({
  envPrefix: "ZOOMINFO_BRIEF",
  // Posts the ZoomInfo OAuth Connect card in Slack. Without it the call fails closed.
  toolApprovals: true,
  onAppMention: mobileMenuInbound(),
  onDirectMessage: mobileMenuInbound(),
  onBlockAction: onMobileMenuAction,
  suggestedPromptsTitle: "What do you want?",
  suggestedPrompts: [
    { title: "Menu", message: "help" },
    {
      title: "Facility moves",
      message: "1 — Facility moves / expansions (NC, three feeds)",
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
