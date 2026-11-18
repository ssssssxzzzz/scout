import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { loadWatchlist, saveWatchlist } from "../lib/watchlist.ts";

export default defineTool({
  description: prompt`
    Add or remove names from the ICP/watchlist filter lanes.
    Does not change ZoomInfo GTM. Filter only.
  `,
  effect: "write",
  inputSchema: z.object({
    lane: z.enum(["competitors", "priority", "pastWork"]),
    action: z.enum(["add", "remove"]),
    name: z.string().min(1),
  }),
  async execute({ lane, action, name }, ctx) {
    const wl = loadWatchlist(ctx.stateRoot);
    const list = wl[lane];
    if (action === "add") {
      if (!list.includes(name)) list.push(name);
    } else {
      wl[lane] = list.filter((x) => x.toLowerCase() !== name.toLowerCase());
    }
    saveWatchlist(ctx.stateRoot, wl);
    return { ok: true, lane, action, name, watchlist: wl };
  },
});
