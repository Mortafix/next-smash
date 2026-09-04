---
target: /calendario
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/moris/Programming/Script/next-smash/src/components/calendar/tournament-calendar.tsx"
target_fingerprint: "sha256:66dde724acc8270a96cb99d94710faec489d8f1e7d8a250a18b824c2a550a74d"
target_path: /Users/moris/Programming/Script/next-smash/src/components/calendar/tournament-calendar.tsx
timestamp: 2026-09-04T07-24-18Z
slug: src-components-calendar-tournament-calendar-tsx
closed: true
---
# Impeccable critique — `/calendario`

## Verdict

**26/40 — acceptable, with a strong visual foundation and important interaction gaps.**

The surface is distinctly NextSmash: condensed hierarchy, court-blue weekday rail, ball-yellow selection and counts, ink borders, hard shadows, Italian Monday-first calendar, freshness metadata, and FITP/TPRA language form a coherent “Cemento & Campo” identity. Its behavioral specificity is weaker: visually it is a calendar, but functionally it behaves like 42 unrelated toggle buttons.

## Nielsen heuristic score

| Heuristic | Score | Evidence |
|---|---:|---|
| Visibility of system status | 2/4 | Selection is visible, but adjacent-month state contradicts the month heading and agenda changes are silent. |
| Match with the real world | 4/4 | Strong Italian localization, Monday-first structure, familiar controls, and padel vocabulary. |
| User control and freedom | 3/4 | Previous, next, and “Oggi” are clear; direct and keyboard-efficient navigation are absent. |
| Consistency and standards | 3/4 | Visually cohesive, but keyboard and adjacent-month behavior depart from calendar conventions. |
| Error prevention | 2/4 | A date in October can be selected while the interface still labels the view as September. |
| Recognition rather than recall | 3/4 | Dates and counts stay visible; adjacent-month selection forces users to reconcile conflicting labels. |
| Flexibility and efficiency | 1/4 | Forty-two tab stops, no spatial arrow navigation, and no month keyboard accelerator. |
| Aesthetic and minimalist design | 3/4 | Dense but purposeful; fixed six-week rows and repeated zero-state emphasis add some noise. |
| Error recovery | 3/4 | Route errors are clear and recoverable; an empty date offers no useful next step. |
| Help and documentation | 2/4 | The introduction and accessible date labels help, but navigation behavior is not communicated. |

## Cognitive load

Moderate: 2 of 8 checks fail.

- **Minimal choices:** 42 date controls become a long linear sequence without spatial keyboard navigation.
- **Working memory:** selecting an adjacent-month date leaves the month title unchanged while the confirming agenda heading sits below the grid.
- The page otherwise maintains one task, clear grouping, a sensible filter → date → results flow, and progressive disclosure.

## Emotional journey

- **Arrival:** energetic and trustworthy; the headline, court palette, and precise freshness timestamp establish purpose quickly.
- **Peak:** distributed tournament counts create an immediate sense of opportunity; the yellow selected state is a strong focal point.
- **Valley:** an adjacent-month choice creates competing truths between month title, muted cell, and agenda date.
- **Ending:** successful paths end at explicit official-detail links; empty paths terminate on a repeated “0” with no next action.

## Priority issues

### [P1] The date grid is not an inclusive calendar control

All 42 dates are consecutive tab stops, arrow keys do nothing, and visual rows/columns have no corresponding calendar/grid semantics. At 320 px, cells measure about 38×52 px, below the product’s 44 px touch-target commitment, and the fixed mobile navigation can cover focused dates near the bottom.

**Correction:** introduce semantic grid rows and column headers, roving `tabIndex`, Arrow/Home/End/PageUp/PageDown behavior, a single initial tab stop, consistently visible focus, and a narrow layout that preserves 44×44 px targets.

### [P1] Adjacent-month selection creates contradictory, weakly announced state

Activating a date from the previous or next month changes the agenda but not the visible month. The selected styling is weakened by the outside-month style, and agenda/result changes are not announced.

**Correction:** activating an adjacent-month date should advance the calendar month, preserve an unmistakable selected state, and update a polite live summary connected to the agenda.

## Supporting observations

- “Oggi” is 36 px high, below the product target.
- The agenda collection is a generic `div`, not a semantic list.
- The agenda count is visually present but not explicitly named to assistive technology.
- The empty state repeats zero emphasis and gives no route to the nearest useful date.
- Event lookup filters the collection once per calendar cell plus once for the agenda: 43 passes per render.
- The route loading state reuses list geometry rather than previewing the calendar.

## Positive evidence

- Document language, skip link, main landmark, heading flow, and named month controls are sound.
- Every date has a complete localized accessible name including event count and “today” state.
- Error and freshness states use appropriate alert/status patterns.
- Measured text contrast passes AA across weekday labels, dates, selected state, outside-month dates, headings, freshness copy, and empty-state copy.
- No document-level horizontal overflow or browser console errors were observed from 320 to 1440 px.
- The deterministic Impeccable detector returned zero findings; these issues require behavioral and structural inspection.

## Persona impact

- **Accessibility-dependent user:** 42 tab stops, absent arrow navigation, silent updates, and focus occlusion make exploration slow and uncertain.
- **Distracted mobile user:** an update below the grid can be hidden behind the fixed navigation with no nearby confirmation.
- **Power user:** week and month traversal cannot use established calendar keyboard conventions.

## Scope guardrail

Tournament filter and card components are user-authored and locked for this pass. They were not modified and are not targets of these recommendations.

Questions skipped: 2 Priority Issues found; scope already fixed by the user and shared filters/cards are locked.
