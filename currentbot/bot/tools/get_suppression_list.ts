import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import {
  ensureSuppressionSeed,
  loadSuppressions,
  storeFromKv,
} from "../lib/suppression.ts";

export default defineTool({
  description: prompt`
    Return the durable suppression list (companies / signal types Scout
    should not re-alert). Seeds once from config/suppression_seed.csv.
    Stored in host.kv — survives hosted redeploy (unlike stateRoot JSON).
  `,
  effect: "read",
  async execute(_args, ctx) {
    const store = storeFromKv(ctx.host.kv);
    const seed = await ensureSuppressionSeed(store);
    const list = await loadSuppressions(store);
    return {
      ok: true,
      seed,
      count: list.items.length,
      notes: list.notes,
      items: list.items,
    };
  },
});
