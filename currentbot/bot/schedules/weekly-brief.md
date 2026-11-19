---
cron: "0 13 * * 1"
---

Weekly Monday AM brief for Jacob (Agile Lab Services / AHP).

Run skill `weekly-brief` now. Use the three searches from skill `three-feeds`, then ignore that skill's watchlist-first step and its 3-card length cap — **keep** the hard quality bar.

1. Call `get_watchlist` as a tag only. Do not filter or rank by it. Do not invent account names. Tag a match `on your list`. Fujifilm Morrisville is the current client — tag carefully; do not promote every EM blip. Holly Springs and College Station stay separate sites.
2. Call `get_mute_list` and apply those noise terms.
3. Geo default: **North Carolina** as state alone (never append "United States"). Rank the whole state by actionability and recency. NC HQ with plant elsewhere does not count. Warn if anyone asks for Triangle zip with no industry filter.
4. Run **three separate feeds** (never one mixed search):
   - Pharma hiring / ops (buyer-adjacent only: sterile, QA, facilities, manufacturing, validation, plant engineering — named site required for a card)
   - Lab-landlord moves (Alexandria / Longfellow style)
   - Intent: decontamination/excursion → Environmental Monitoring; sterile fill-finish → Sterile/Aseptic Manufacturing (say if exact phrase missing) — supporting evidence only unless named plant/suite
5. Noise cut + hard quality bar: drop clinical-trial writeups, earnings, restaurants, generic permits unless lab/pharma suite; drop/demote bare HQ-only intent; never lead with aesthetics/cosmetic HQ intent (e.g. Merz) without a confirmed Raleigh plant/suite. Prefer scoops over bare intent. No GTM update / bulk enrich.
6. Post **5–10** ranked AHP-grade events when they clear the bar. Fewer when the week is thin. Never pad. If nothing clears: **No AHP-grade facility moves today** (or this week). Each line: rank, company, **named site**, Observed signal + date, why-now, next step, and one closing line **Why this matters for AHP** (6-log kill / 24h mobilize / shutdown adjacency).
7. After the list, call `post_act_cards` with the top ≤3 that cleared (Prep me / Mute this / Add to watchlist). Skip buttons if zero. Offer dig-in by number for the rest.
8. Never mention Nighthawk. Never run mcp oauth. cursorAccount ZoomInfo only. Slack only — no ZoomInfo website.

If this run has no Slack thread to post into, write the brief clearly so a later Slack follow-up can paste or dig in by number.
