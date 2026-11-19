/**
 * Slack channel routing — IDs from env/secrets only.
 * Jacob creates channels manually and pastes IDs; agents never invent them.
 * Missing lane IDs are skipped cleanly (no soft fallback onto another lane).
 */

export type SignalLane =
  | "hot_excursions"
  | "facility_events"
  | "lab_moves"
  | "weekly"
  | "digest"
  | "ops";

export type ChannelMap = {
  digest: string | null;
  /** Hot excursions / hot leads (aliases). */
  hotExcursions: string | null;
  facilityEvents: string | null;
  labMoves: string | null;
  weekly: string | null;
  ops: string | null;
  digestTeamId: string | null;
  /** @deprecated Phase 1 name — same as hotExcursions when only HOT_LEADS is set. */
  hotLeads: string | null;
};

function envId(...names: string[]): string | null {
  for (const name of names) {
    const v = (process.env[name] ?? "").trim();
    if (v !== "") return v;
  }
  return null;
}

export function loadChannelMap(): ChannelMap {
  // Digest: existing Digests-here secret wins over SCOUT_CHANNEL_DIGEST alias.
  const digest =
    envId("SCOUT_DIGEST_CHANNEL_ID") ?? envId("SCOUT_CHANNEL_DIGEST");
  // Hot excursions prefer the Phase 2 name; HOT_LEADS is the Phase 1 alias.
  const hotExcursions =
    envId("SCOUT_CHANNEL_HOT_EXCURSIONS") ??
    envId("SCOUT_CHANNEL_HOT_LEADS");
  return {
    digest,
    hotExcursions,
    facilityEvents: envId("SCOUT_CHANNEL_FACILITY_EVENTS"),
    labMoves: envId("SCOUT_CHANNEL_LAB_MOVES"),
    weekly: envId("SCOUT_CHANNEL_WEEKLY"),
    ops: envId("SCOUT_OPS_CHANNEL_ID"),
    digestTeamId: envId("SCOUT_DIGEST_TEAM_ID"),
    hotLeads: hotExcursions,
  };
}

/** Digest destination only — does not invent a fallback. */
export function resolveDigestChannel(
  map: ChannelMap = loadChannelMap(),
): string | null {
  return map.digest;
}

/** Weekly lane only — skip cleanly when unset (no digest fallback). */
export function resolveWeeklyChannel(
  map: ChannelMap = loadChannelMap(),
): string | null {
  return map.weekly;
}

/** @deprecated Use resolveLaneChannel("hot_excursions"). */
export function resolveHotLeadsChannel(
  map: ChannelMap = loadChannelMap(),
): string | null {
  return map.hotExcursions;
}

export function resolveOpsChannel(
  map: ChannelMap = loadChannelMap(),
): string | null {
  return map.ops;
}

/**
 * Resolve a signal lane to a Slack channel ID.
 * Returns null when that lane's secret is unset — callers must skip, not invent.
 */
export function resolveLaneChannel(
  lane: SignalLane,
  map: ChannelMap = loadChannelMap(),
): string | null {
  switch (lane) {
    case "hot_excursions":
      return map.hotExcursions;
    case "facility_events":
      return map.facilityEvents;
    case "lab_moves":
      return map.labMoves;
    case "weekly":
      return map.weekly;
    case "digest":
      return map.digest;
    case "ops":
      return map.ops;
    default:
      return null;
  }
}

/** Env/secret names Jacob must set for each lane (for docs / tool hints). */
export function laneSecretNames(lane: SignalLane): string[] {
  switch (lane) {
    case "hot_excursions":
      return ["SCOUT_CHANNEL_HOT_EXCURSIONS", "SCOUT_CHANNEL_HOT_LEADS"];
    case "facility_events":
      return ["SCOUT_CHANNEL_FACILITY_EVENTS"];
    case "lab_moves":
      return ["SCOUT_CHANNEL_LAB_MOVES"];
    case "weekly":
      return ["SCOUT_CHANNEL_WEEKLY"];
    case "digest":
      return ["SCOUT_DIGEST_CHANNEL_ID", "SCOUT_CHANNEL_DIGEST"];
    case "ops":
      return ["SCOUT_OPS_CHANNEL_ID"];
    default:
      return [];
  }
}

export function channelMapSummary(
  map: ChannelMap = loadChannelMap(),
): Record<SignalLane, string | null> {
  return {
    digest: map.digest,
    hot_excursions: map.hotExcursions,
    facility_events: map.facilityEvents,
    lab_moves: map.labMoves,
    weekly: map.weekly,
    ops: map.ops,
  };
}
