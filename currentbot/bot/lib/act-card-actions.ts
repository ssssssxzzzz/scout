/**
 * Deterministic Block Kit handlers for claim / contacted / not-a-fit / suppress.
 * Idempotent in-place chat.update; durable lead state in host.kv.
 */

import type {
  SlackBlockAction,
  SlackBinding,
  SlackDispatchDecision,
} from "@grok/agent-sdk/channels/slack";
import { blockActionAuth } from "@grok/agent-sdk/channels/slack";
import {
  ACT_ACTION,
  buildNotFitReasonBlocks,
  buildResolvedActCardBlocks,
  decodeActCardValue,
  isActActionId,
  isNotFitReasonId,
  NOT_FIT_REASONS,
  sectionTextFromBlocks,
} from "./act-cards.ts";
import { parseLane } from "./lanes.ts";
import {
  claimLead,
  markContacted,
  markOutcome,
  storeFromKv,
} from "./lead-state.ts";
import {
  addSuppression,
  storeFromKv as suppressStore,
} from "./suppression.ts";

const NOT_FIT_DAYS = 90;

function mention(userId: string): string {
  return userId.trim() !== "" ? `<@${userId.trim()}>` : "someone";
}

function reasonLabel(id: string): string {
  return NOT_FIT_REASONS.find((r) => r.id === id)?.label ?? id;
}

/**
 * Idempotent in-place update: replace the whole message with resolved blocks
 * (or a reason picker). Soft-fail — durable state is the source of truth.
 */
export async function updateActCardMessage(
  ctx: SlackBinding,
  action: SlackBlockAction,
  blocks: Record<string, unknown>[],
  text: string,
): Promise<boolean> {
  try {
    const client = await ctx.host.slack.getClient();
    const result = await client.chat.update({
      channel: action.channelId,
      ts: action.messageTs,
      text,
      blocks: blocks as never,
    });
    return result.ok === true;
  } catch {
    return false;
  }
}

export async function onActCardAction(
  ctx: SlackBinding,
  action: SlackBlockAction,
): Promise<SlackDispatchDecision | null> {
  if (!isActActionId(action.actionId)) {
    return null;
  }

  const decoded = decodeActCardValue(action.value);
  const company = decoded.c.trim();
  if (company === "") {
    return null;
  }
  const signalType = decoded.s?.trim() || "*";
  const lane = parseLane(decoded.l ?? null) ?? undefined;
  const store = storeFromKv(ctx.host.kv);
  const bodyText =
    sectionTextFromBlocks(action.messageBlocks) || `*${company}*`;
  const auth = blockActionAuth(action);

  // --- Claim ---
  if (action.actionId === ACT_ACTION.claim) {
    const result = await claimLead(store, {
      company,
      signalType,
      ownerSlackId: action.userId,
      ownerName: action.userName,
      lane,
      channelId: action.channelId,
      messageTs: action.messageTs,
    });
    if (result.reason === "owned_by_other" && result.priorOwner) {
      const note = `Already claimed by ${mention(result.priorOwner)} · ${company}`;
      await updateActCardMessage(
        ctx,
        action,
        buildResolvedActCardBlocks({ bodyText, statusNote: note }),
        note,
      );
      return {
        auth,
        message: `User tapped Claim for "${company}" but it is already owned by Slack user ${result.priorOwner}. Confirm that in one short Slack line. Do not run a new scan.`,
      };
    }
    if (result.reason === "terminal") {
      const note = `Closed (${result.record.status}) · ${company}`;
      await updateActCardMessage(
        ctx,
        action,
        buildResolvedActCardBlocks({ bodyText, statusNote: note }),
        note,
      );
      return {
        auth,
        message: `User tapped Claim for "${company}" but the lead is already ${result.record.status}. Confirm in one short Slack line. Do not run a new scan.`,
      };
    }
    const note = result.idempotent
      ? `Already yours · claimed by ${mention(action.userId)} · ${company}`
      : `Claimed by ${mention(action.userId)} · ${company}`;
    await updateActCardMessage(
      ctx,
      action,
      buildResolvedActCardBlocks({ bodyText, statusNote: note }),
      note,
    );
    return {
      auth,
      message: `User tapped Claim for "${company}". owner_slack_id=${action.userId}. Confirm claim in one short Slack line. Do not run a new scan.`,
    };
  }

  // --- Contacted ---
  if (action.actionId === ACT_ACTION.contacted) {
    const result = await markContacted(store, {
      company,
      signalType,
      ownerSlackId: action.userId,
      ownerName: action.userName,
      channelId: action.channelId,
      messageTs: action.messageTs,
    });
    if (!result.ok) {
      const note = `Closed (${result.record.status}) · ${company}`;
      await updateActCardMessage(
        ctx,
        action,
        buildResolvedActCardBlocks({ bodyText, statusNote: note }),
        note,
      );
      return {
        auth,
        message: `User tapped Contacted for "${company}" but status is ${result.record.status}. Confirm in one short Slack line. Do not run a new scan.`,
      };
    }
    const note = result.idempotent
      ? `Already marked contacted · ${mention(action.userId)} · ${company}`
      : `Contacted by ${mention(action.userId)} · ${company}`;
    await updateActCardMessage(
      ctx,
      action,
      buildResolvedActCardBlocks({ bodyText, statusNote: note }),
      note,
    );
    return {
      auth,
      message: `User tapped Contacted for "${company}". Confirm in one short Slack line. Do not run a new scan.`,
    };
  }

  // --- Not a fit → reason picker (in-message modal) ---
  if (action.actionId === ACT_ACTION.notFit) {
    const picker = buildNotFitReasonBlocks({
      company,
      signalType: signalType === "*" ? undefined : signalType,
      lane,
      bodyText: `${bodyText}\n\n*Not a fit* — pick a reason (90-day suppress).`,
    });
    await updateActCardMessage(
      ctx,
      action,
      picker,
      `Not a fit · ${company} — pick a reason`,
    );
    // No model turn needed for the picker itself.
    return null;
  }

  // --- Not a fit reason → 90d suppress ---
  if (action.actionId === ACT_ACTION.notFitReason) {
    const reasonId = decoded.r?.trim() || "other";
    const label = reasonLabel(reasonId);
    const expiresAt = new Date(
      Date.now() + NOT_FIT_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    await markOutcome(store, {
      company,
      signalType,
      status: "not_fit",
      ownerSlackId: action.userId,
      ownerName: action.userName,
      reason: isNotFitReasonId(reasonId) ? reasonId : label,
      expDays: NOT_FIT_DAYS,
      channelId: action.channelId,
      messageTs: action.messageTs,
    });

    await addSuppression(suppressStore(ctx.host.kv), {
      company,
      reason: `not_a_fit:${label}`,
      expiresAt,
    });

    const note = `Not a fit · ${label} · suppressed ${NOT_FIT_DAYS}d · ${mention(action.userId)} · ${company}`;
    await updateActCardMessage(
      ctx,
      action,
      buildResolvedActCardBlocks({ bodyText, statusNote: note }),
      note,
    );
    return {
      auth,
      message: `User marked "${company}" Not a fit (${label}). Suppression is already written for 90 days. Confirm in one short Slack line. Do not run a new scan.`,
    };
  }

  // --- Suppress (durable, no expiry unless tool says) ---
  if (action.actionId === ACT_ACTION.suppress) {
    await markOutcome(store, {
      company,
      signalType,
      status: "suppressed",
      ownerSlackId: action.userId,
      ownerName: action.userName,
      reason: "suppress_button",
      channelId: action.channelId,
      messageTs: action.messageTs,
    });
    await addSuppression(suppressStore(ctx.host.kv), {
      company,
      reason: "suppressed from Slack",
    });
    const note = `Suppressed · ${mention(action.userId)} · ${company}`;
    await updateActCardMessage(
      ctx,
      action,
      buildResolvedActCardBlocks({ bodyText, statusNote: note }),
      note,
    );
    return {
      auth,
      message: `User tapped Suppress for "${company}". Suppression is already written. Confirm in one short Slack line. Do not run a new scan.`,
    };
  }

  // --- Prep / Mute / Watch (still model-turn tools; resolve UI) ---
  if (action.actionId === ACT_ACTION.prep) {
    await updateActCardMessage(
      ctx,
      action,
      buildResolvedActCardBlocks({
        bodyText,
        statusNote: `Prep me · ${mention(action.userId)} · ${company}`,
      }),
      `Prep me · ${company}`,
    );
    return {
      auth,
      message: `User tapped Prep me for "${company}". Run playbook 5 now for that company only: short firmographics + latest facility/ops/QA scoops + facilities/QA/ops contacts only (no generic HR/sales). Each signal line ends with Why this matters for AHP. Do not open ZoomInfo website links as the answer — Slack only.`,
    };
  }

  if (action.actionId === ACT_ACTION.mute) {
    await updateActCardMessage(
      ctx,
      action,
      buildResolvedActCardBlocks({
        bodyText,
        statusNote: `Muted · ${mention(action.userId)} · ${company}`,
      }),
      `Muted · ${company}`,
    );
    return {
      auth,
      message: `User tapped Mute this for "${company}". Call update_mute_list with action=add and term="${company}". Confirm in one short Slack line. Do not run a new scan.`,
    };
  }

  // watch
  await updateActCardMessage(
    ctx,
    action,
    buildResolvedActCardBlocks({
      bodyText,
      statusNote: `Watchlist · ${mention(action.userId)} · ${company}`,
    }),
    `Watchlist · ${company}`,
  );
  return {
    auth,
    message: `User tapped Add to watchlist for "${company}". Call update_watchlist with lane=priority, action=add, and name="${company}". Confirm in one short Slack line. Do not run a new scan.`,
  };
}
