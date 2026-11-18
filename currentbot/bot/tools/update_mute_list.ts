import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { loadMuteList, saveMuteList } from "../lib/mute-list.ts";

export default defineTool({
  description: prompt`
    Add or remove a noise term from the mute list (Slack-editable).
    Does not change ZoomInfo. Filter only.
  `,
  effect: "write",
  inputSchema: z.object({
    action: z.enum(["add", "remove"]),
    term: z.string().min(1),
  }),
  async execute({ action, term }, ctx) {
    const list = loadMuteList(ctx.stateRoot);
    const normalized = term.trim();
    if (action === "add") {
      if (!list.terms.some((t) => t.toLowerCase() === normalized.toLowerCase())) {
        list.terms.push(normalized);
      }
    } else {
      list.terms = list.terms.filter(
        (t) => t.toLowerCase() !== normalized.toLowerCase(),
      );
    }
    saveMuteList(ctx.stateRoot, list);
    return { ok: true, action, term: normalized, muteList: list };
  },
});
