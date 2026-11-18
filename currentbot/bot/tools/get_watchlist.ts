import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { loadWatchlist } from "../lib/watchlist.ts";

export default defineTool({
  description: prompt`
    Return the current ICP/watchlist filter (competitors, priority, past work).
    This is a weak prior for filtering — NOT the briefing content.
  `,
  effect: "read",
  async execute(_args, ctx) {
    return loadWatchlist(ctx.stateRoot);
  },
});
