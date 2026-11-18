import { slackChannel } from "@grok/agent-sdk/channels/slack";

/**
 * Slack channel (Socket Mode).
 *
 * Tokens: ZOOMINFO_BRIEF_SLACK_BOT_TOKEN + ZOOMINFO_BRIEF_SLACK_APP_TOKEN
 * (see .agent-serve/slack/env.example).
 *
 * Menu picks: Slack allows ≤4 suggestedPrompts (chip-style). True Block Kit
 * buttons need onBlockAction + custom blocks — not wired here (keeps Socket
 * Mode stable). Numbered menu text in instructions covers picks 1–6.
 */
export default slackChannel({
  envPrefix: "ZOOMINFO_BRIEF",
  // Posts the ZoomInfo OAuth Connect card in Slack. Without it the call fails closed.
  toolApprovals: true,
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
