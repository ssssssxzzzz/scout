/** Shared prompt body for the weekday morning digest schedule. */
export const MORNING_DIGEST_PROMPT = `Weekday morning AHP digest for Jacob (Agile Lab Services).

Run skill \`morning-digest\` now. Slack-only boss UX — never send anyone to the ZoomInfo website.

## Hard quality bar (do not pad)

Prefer **facility/ops scoops** only:
- Expansions, new suites, shutdowns, cleanroom / validation / commissioning
- Lab-landlord moves (Alexandria / Longfellow style)
- Plant engineering / QA / sterile / validation hiring **tied to a named manufacturing site or suite**

**Drop or demote** bare intent-only cards (e.g. Environmental Monitoring score with HQ-only geo, no suite/plant named) unless paired with a facility scoop or a named manufacturing site.

Cap **≤3** cards. Prefer **0–2 excellent** over padding with weak signals. If nothing clears the bar, post exactly: **No AHP-grade facility moves today** — do **not** fill with intent scores or generic hiring scoops.

Never lead with aesthetics / cosmetic HQ intent (e.g. Merz) unless a Raleigh plant/suite is confirmed.

Fujifilm Morrisville is the **current client**: tag carefully; do **not** turn every EM blip into a digest card. Holly Springs and College Station stay separate sites.

## Procedure

1. Call \`get_watchlist\` as a tag only (do not invent names; empty is fine).
2. Call \`get_mute_list\` and apply those noise terms.
3. Geo default: **North Carolina** as state alone (never append "United States"). Soft-bias RTP / Morrisville / Holly Springs when signals compete. An NC headquarters whose plant is elsewhere does not count.
4. Run **three separate feeds** from skill \`three-feeds\` (never one mixed search):
   - Pharma hiring / ops (buyer-adjacent only: sterile, QA, facilities, manufacturing, validation, plant engineering — no generic HR; role must name a site/suite)
   - Lab-landlord moves (Alexandria / Longfellow style)
   - Intent: decontamination/excursion → Environmental Monitoring; sterile fill-finish → Sterile/Aseptic Manufacturing (say if exact phrase missing) — **supporting evidence only**, not a standalone card unless a named plant/suite is present
5. Noise cut: drop clinical trials, earnings, restaurants, generic permits unless lab/pharma suite. Prefer scoops over bare intent. No GTM update / bulk enrich. No alert-mode spam — ZoomInfo app already covers alerts; this is a short morning digest only.
6. Post only cards that clear the quality bar (**≤3**, prefer fewer). Each item: company, **named site/suite**, Observed signal + date, next step, and one **Why this matters for AHP** line (6-log kill / ~24h mobilize / shutdown adjacency).
7. After the text summary, if there is ≥1 card, call \`post_act_cards\` with those same ≤3 cards so Slack shows **Prep me / Mute this / Add to watchlist** buttons. If zero cards, skip \`post_act_cards\`.
8. Close with: dig-in by number, or tap a button (when cards exist). Never mention Nighthawk. Never run mcp oauth. cursorAccount ZoomInfo only.

If ZoomInfo tools are unavailable, say so in one short Slack line and stop — do not invent scoops.`;
