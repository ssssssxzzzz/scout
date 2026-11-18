/** Shared prompt body for the weekday morning digest schedule. */
export const MORNING_DIGEST_PROMPT = `Weekday morning AHP digest for Jacob (Agile Lab Services).

Run skill \`morning-digest\` now. Slack-only boss UX — never send anyone to the ZoomInfo website.

1. Call \`get_watchlist\` as a tag only (do not invent names; empty is fine).
2. Call \`get_mute_list\` and apply those noise terms.
3. Geo default: **North Carolina** as state alone (never append "United States"). Soft-bias RTP / Morrisville / Holly Springs when signals compete.
4. Run **three separate feeds** from skill \`three-feeds\` (never one mixed search):
   - Pharma hiring / ops (buyer-adjacent only: sterile, QA, facilities, manufacturing, validation, plant engineering — no generic HR)
   - Lab-landlord moves (Alexandria / Longfellow style)
   - Intent: decontamination/excursion → Environmental Monitoring; sterile fill-finish → Sterile/Aseptic Manufacturing (say if exact phrase missing)
5. Noise cut: drop clinical trials, earnings, restaurants, generic permits unless lab/pharma suite. Prefer scoops + intent. No GTM update / bulk enrich. No alert-mode spam — ZoomInfo app already covers alerts; this is a short morning digest only.
6. Post **top ~3** AHP-relevant items across the three feeds (fewer when quiet; never pad). Each item: company, site, Observed signal + date, next step, and one **Why this matters for AHP** line (6-log kill / ~24h mobilize / shutdown adjacency).
7. After the text summary, call \`post_act_cards\` with those same ≤3 cards so Slack shows **Prep me / Mute this / Add to watchlist** buttons.
8. Close with: dig-in by number, or tap a button. Never mention Nighthawk. Never run mcp oauth. cursorAccount ZoomInfo only.

If ZoomInfo tools are unavailable, say so in one short Slack line and stop — do not invent scoops.`;
