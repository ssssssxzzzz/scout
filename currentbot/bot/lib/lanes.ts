/**
 * Map AHP signal types / score factors → Slack routing lanes.
 * One ZoomInfo scan; fan-out is post-only by lane.
 */

import type { ScoreFactorId } from "./scoring.ts";
import type { SignalLane } from "./channel-map.ts";

const HOT_EXCURSION_TYPES = new Set([
  "shutdown_signal",
  "hot_excursion",
  "excursion",
  "environmental_monitoring",
  "em_excursion",
]);

const LAB_MOVE_TYPES = new Set([
  "landlord_move",
  "lab_move",
  "lab_landlord",
  "suite_lease",
]);

const FACILITY_EVENT_TYPES = new Set([
  "facility_expansion",
  "suite_qualification",
  "cleanroom_validation",
  "buyer_adjacent_hiring",
  "intent_site_named",
  "intent_paired",
  "facility_event",
  "named_site",
]);

/**
 * Classify a signal_type (or primary score factor) into a routing lane.
 * Weekly is opt-in via explicit lane override (Monday rollup), not inferred.
 */
export function laneForSignalType(signalType: string): SignalLane {
  const key = signalType.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "" || key === "unknown") return "facility_events";
  if (HOT_EXCURSION_TYPES.has(key)) return "hot_excursions";
  if (LAB_MOVE_TYPES.has(key)) return "lab_moves";
  if (FACILITY_EVENT_TYPES.has(key)) return "facility_events";
  // Intent / decontamination-ish strings → hot excursions when named that way.
  if (/excursion|shutdown|turnaround|decon/.test(key)) return "hot_excursions";
  if (/landlord|alexandria|longfellow|lease|lab_re/.test(key)) return "lab_moves";
  return "facility_events";
}

export function laneForPrimaryFactor(
  factor: ScoreFactorId | null | undefined,
): SignalLane {
  if (!factor) return "facility_events";
  return laneForSignalType(factor);
}

export function parseLane(raw: string | undefined | null): SignalLane | null {
  if (raw === undefined || raw === null) return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (
    key === "hot_excursions" ||
    key === "hot_leads" ||
    key === "hot"
  ) {
    return "hot_excursions";
  }
  if (key === "facility_events" || key === "facility") return "facility_events";
  if (key === "lab_moves" || key === "lab") return "lab_moves";
  if (key === "weekly") return "weekly";
  if (key === "digest") return "digest";
  if (key === "ops") return "ops";
  return null;
}
