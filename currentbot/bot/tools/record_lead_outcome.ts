import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  claimLead,
  markContacted,
  markOutcome,
  storeFromKv,
} from "../lib/lead-state.ts";
import {
  addSuppression,
  storeFromKv as suppressStore,
} from "../lib/suppression.ts";

/**
 * Natural-language / tool path for claim + outcomes when slash commands
 * are not available in Agent SDK Socket Mode.
 */
export default defineTool({
  description: prompt`
    Record a lead outcome from natural language when Jacob says a deal was
    won / lost, or asks to claim / mark contacted / not a fit.
    Prefer Block Kit buttons when the card is in Slack; use this tool for
    chat paths (slash commands are not wired).
    not_fit writes a 90-day suppression. won/lost are terminal statuses.
  `,
  effect: "write",
  inputSchema: z.object({
    company: z.string().min(1),
    outcome: z.enum([
      "claim",
      "contacted",
      "not_fit",
      "won",
      "lost",
      "suppressed",
    ]),
    signalType: z.string().optional(),
    ownerSlackId: z
      .string()
      .optional()
      .describe("Slack user id for claim/owner; required for claim when known."),
    ownerName: z.string().optional(),
    reason: z.string().optional(),
  }),
  async execute(
    { company, outcome, signalType, ownerSlackId, ownerName, reason },
    ctx,
  ) {
    if (ctx.session.purpose === "eval") {
      return {
        ok: true,
        company,
        outcome,
        reason: "eval_skipped",
        hint: "Eval sessions do not write lead outcome kv.",
      };
    }

    const store = storeFromKv(ctx.host.kv);
    const attrs = ctx.session.auth?.attributes ?? {};
    const sessionUser =
      typeof attrs.user_id === "string" ? attrs.user_id.trim() : "";
    const owner = (ownerSlackId ?? sessionUser).trim();

    if (outcome === "claim") {
      if (owner === "") {
        return {
          ok: false,
          company,
          outcome,
          reason: "missing_owner_slack_id",
          hint: "Pass ownerSlackId or run inside a Slack session.",
        };
      }
      const result = await claimLead(store, {
        company,
        signalType,
        ownerSlackId: owner,
        ownerName,
      });
      return {
        ok: result.ok,
        company: company.trim(),
        outcome,
        idempotent: result.idempotent,
        status: result.record.status,
        owner_slack_id: result.record.ownerSlackId ?? null,
        claimReason: result.reason,
        priorOwner: result.priorOwner ?? null,
        record: result.record,
      };
    }

    if (outcome === "contacted") {
      const result = await markContacted(store, {
        company,
        signalType,
        ownerSlackId: owner || undefined,
        ownerName,
      });
      return {
        ok: result.ok,
        company: company.trim(),
        outcome,
        idempotent: result.idempotent,
        status: result.record.status,
        owner_slack_id: result.record.ownerSlackId ?? null,
        record: result.record,
        ...(result.reason ? { failReason: result.reason } : {}),
      };
    }

    if (outcome === "not_fit") {
      const expiresAt = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const result = await markOutcome(store, {
        company,
        signalType,
        status: "not_fit",
        ownerSlackId: owner || undefined,
        ownerName,
        reason: reason ?? "not_a_fit",
        expDays: 90,
      });
      await addSuppression(suppressStore(ctx.host.kv), {
        company,
        reason: `not_a_fit:${reason ?? "nl"}`,
        expiresAt,
      });
      return {
        ok: result.ok,
        company: company.trim(),
        outcome,
        idempotent: result.idempotent,
        status: result.record.status,
        owner_slack_id: result.record.ownerSlackId ?? null,
        suppressedDays: 90,
        expiresAt,
        record: result.record,
      };
    }

    if (outcome === "suppressed") {
      const result = await markOutcome(store, {
        company,
        signalType,
        status: "suppressed",
        ownerSlackId: owner || undefined,
        ownerName,
        reason: reason ?? "suppressed",
      });
      await addSuppression(suppressStore(ctx.host.kv), {
        company,
        reason: reason ?? "suppressed from NL",
      });
      return {
        ok: result.ok,
        company: company.trim(),
        outcome,
        idempotent: result.idempotent,
        status: result.record.status,
        owner_slack_id: result.record.ownerSlackId ?? null,
        record: result.record,
      };
    }

    // won | lost
    const result = await markOutcome(store, {
      company,
      signalType,
      status: outcome,
      ownerSlackId: owner || undefined,
      ownerName,
      reason,
    });
    return {
      ok: result.ok,
      company: company.trim(),
      outcome,
      idempotent: result.idempotent,
      status: result.record.status,
      owner_slack_id: result.record.ownerSlackId ?? null,
      record: result.record,
    };
  },
});
