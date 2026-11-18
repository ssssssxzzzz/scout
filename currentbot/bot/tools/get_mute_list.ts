import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { loadMuteList } from "../lib/mute-list.ts";

export default defineTool({
  description: prompt`
    Return the Slack-editable mute list (noise terms to drop before act cards).
    Defaults include clinical trials, earnings, restaurants.
  `,
  effect: "read",
  async execute(_args, ctx) {
    return loadMuteList(ctx.stateRoot);
  },
});
