# Three feeds (never one mixed search)

Use this whenever Jacob picks facility moves, a broad NC/state scan, morning digest, weekly brief, or any multi-signal brief. Lab-landlord moves get buried in a single mixed scoop dump — always run **three separate** tool calls.

Morning digest and on-demand playbooks 1–4: apply the **hard quality bar** below, then cap **≤3** cards. Weekly brief uses the same three searches and the same quality bar, then may rank **5–10** under skill `weekly-brief` (no watchlist filter, no 3-card length cap — still never pad with bare intent).

## Hard quality bar (digest + playbooks 1–4)

Prefer **facility/ops scoops**:

1. Expansions, new suites, shutdowns, cleanroom / validation / commissioning
2. Lab-landlord moves (Alexandria / Longfellow)
3. Plant engineering / QA / sterile / validation hiring tied to a **named manufacturing site or suite**

**Drop or demote** bare intent-only cards (Environmental Monitoring or Sterile/Aseptic score with HQ-only geo, no suite/plant named) unless paired with a facility scoop or named manufacturing site.

Cap **≤3** cards for morning digest and playbooks 1–4. Prefer **0–2 excellent** over padding. If nothing clears the bar, say **No AHP-grade facility moves today** — do **not** fill with intent scores or generic hiring scoops.

Never lead with aesthetics / cosmetic HQ intent (e.g. Merz) unless a Raleigh plant/suite is confirmed.

Fujifilm Morrisville is the **current client**: tag carefully; do not treat every EM blip as a card. Holly Springs and College Station stay separate sites.

Every kept card ends with **Why this matters for AHP**. Slack-only. No Nighthawk.

## Order

1. **Watchlist-first** (except morning digest ranking and weekly brief). `get_watchlist`. If `priority` / `competitors` (or names Jacob typed) are non-empty, pull those accounts first in each lane. If empty, ask or use the names he typed — do not invent Alcami/Fujifilm defaults. Morning digest / weekly: tag only.
2. **Mute list.** `get_mute_list` — drop hits that match mute terms (defaults: clinical trials, earnings, restaurants).
3. **Location.** Default **North Carolina** unless he overrides. Soft bias **RTP / Morrisville / Holly Springs**. State name alone — never append `"United States"`. If he asks for a Triangle zip with no industry filter, warn that results will be restaurants/junk. An NC headquarters whose plant is elsewhere does not count.
4. Run the three feeds below as **separate** searches.
5. Apply the hard quality bar. Cap morning digest / playbooks 1–4 at **≤3 act cards** total. Prefer fewer excellent cards. Label Observed vs Inference.
6. After text cards (when ≥1 cleared the bar), call `post_act_cards` with the same ≤3 items + `signalType` (**Claim / Contacted / Not a fit / Suppress** + Prep / Mute / Watchlist). Then `route_lead_alerts` with those cards (skip unset lane secrets). Also offer dig-in by number (`1`/`2`/`3`). Skip both when zero cards.

## Feed A — Pharma hiring / ops

- Scoops / signals for **buyer-adjacent** roles only: sterile manufacturing, QA / sterility assurance, facilities / plant engineering, validation, CDMO engineering/ops.
- Role must be tied to a **named site or suite** to clear the quality bar for a digest/playbook card.
- Drop generic HR, CHRO moves, Continuity-style generic hiring scoops, and non-buyer open-role noise.

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

**Intent is supporting evidence, not a default card.** A bare EM / sterile intent score with HQ-only location does **not** clear the quality bar. Promote intent to a card only when:

- a named manufacturing plant or suite is in the hit, **or**
- it is paired with a facility/ops scoop from Feed A or B for the same account/site.

## Noise cut (all feeds)

Drop: clinical-trial writeups, earnings dumps, restaurants, generic building permits unless the address is a lab/pharma suite, bare HQ-only intent padding, aesthetics/cosmetic HQ intent without a confirmed plant/suite. Prefer scoops over bare intent; leave GTM updates and bulk enrich off until Jacob asks.
