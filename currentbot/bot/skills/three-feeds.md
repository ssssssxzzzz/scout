# Three feeds (never one mixed search)

Use this whenever Jacob picks facility moves, a broad NC/state scan, or any multi-signal brief. The weekly brief uses these three searches, then ranks 5–10 events under skill `weekly-brief` (no watchlist filter, no 3-card cap). Lab-landlord moves get buried in a single mixed scoop dump — always run **three separate** tool calls.

## Order

1. **Watchlist-first.** `get_watchlist`. If `priority` / `competitors` (or names Jacob typed) are non-empty, pull those accounts first in each lane. If empty, ask or use the names he typed — do not invent Alcami/Fujifilm defaults.
2. **Mute list.** `get_mute_list` — drop hits that match mute terms (defaults: clinical trials, earnings, restaurants).
3. **Location.** Default **North Carolina** unless he overrides. Soft bias **RTP / Morrisville / Holly Springs**. State name alone — never append `"United States"`. If he asks for a Triangle zip with no industry filter, warn that results will be restaurants/junk.
4. Run the three feeds below as **separate** searches.
5. Cap the reply at **≤3 act cards** total. Each card ends with **Why this matters for AHP** (6-log kill / ~24h mobilize / shutdown adjacency). Label Observed vs Inference.
6. After cards: offer dig-in by number (`1`/`2`/`3`) and `prep <account>` → facilities/QA/ops contacts only.

## Feed A — Pharma hiring / ops

- Scoops / signals for **buyer-adjacent** roles only: sterile manufacturing, QA / sterility assurance, facilities / plant engineering, validation, CDMO engineering/ops.
- Drop generic HR, CHRO moves, and non-buyer open-role noise.

## Feed B — Lab-landlord moves

- Separate scoop search aimed at Alexandria / Longfellow–style lab RE: suite lease, campus, landlord/tenant, move-in/out, buildout of lab/pharma space.
- Keep only when the address or tenant is lab/pharma. Drop generic commercial permits.

## Feed C — Intent (mapped topics)

Always map before calling `search_intent`:

| Jacob says | ZoomInfo topic |
| --- | --- |
| decontamination / excursion | **Environmental Monitoring** |
| sterile fill-finish | **Sterile/Aseptic Manufacturing** |

If the exact topic phrase is missing from the catalog, say so in Slack and use the closest available topic. Prefer pharma/CDMO industry filter when the tool allows it.

## Noise cut (all feeds)

Drop: clinical-trial writeups, earnings dumps, restaurants, generic building permits unless the address is a lab/pharma suite. Prefer scoops + intent; leave GTM updates and bulk enrich off until Jacob asks.
