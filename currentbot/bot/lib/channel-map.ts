/**
 * Slack channel routing — IDs from env/secrets only.
 * Jacob creates channels manually and pastes IDs; agents never invent them.
 */

export type ChannelMap = {
  digest: string | null;
  hotLeads: string | null;
  weekly: string | null;
  ops: string | null;
  digestTeamId: string | null;
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
  return {
    digest,
    hotLeads: envId("SCOUT_CHANNEL_HOT_LEADS"),
    weekly: envId("SCOUT_CHANNEL_WEEKLY"),
    ops: envId("SCOUT_OPS_CHANNEL_ID"),
    digestTeamId: envId("SCOUT_DIGEST_TEAM_ID"),
  };
}

/** Soft fan-out: missing lanes fall back to digest when present. */
export function resolveDigestChannel(map: ChannelMap = loadChannelMap()): string | null {
  return map.digest;
}

export function resolveWeeklyChannel(map: ChannelMap = loadChannelMap()): string | null {
  return map.weekly ?? map.digest;
}

export function resolveHotLeadsChannel(map: ChannelMap = loadChannelMap()): string | null {
  return map.hotLeads;
}

export function resolveOpsChannel(map: ChannelMap = loadChannelMap()): string | null {
  return map.ops;
}
