# Climbing Monkey: Sport & Healthcare alignment

Date: 3 October 2026. Assessment of the **design**, written before most of the app was built. It is not a claim that proposed features are implemented or a prediction of jury scores; the [README](../README.md#what-works) lists what works.

## Overall assessment

**Strong conceptual fit; working value still needs demonstration.** The sports brief asks for a specific user group, connected information, informed participation and an achievable next step. Climbing Monkey's profile-first loop answers those needs well: connect climb history, assessments and wellbeing observations → explain a focus → offer an eligible quest → follow up.

The main risk is a visually attractive collection of disconnected features. A triangle, pose test, hand photo and monkey only become a strong solution when the demo shows how their information changes a real decision. A grade-like shape alone is not enough, and the current documents do not establish a validated style score or effective personalized training program.

The primary source is the [sports-track digest](../context/tracks/open-sport-healthcare.md), with page references and links to both supplied PDFs. The [product design](climbing-app-design.md) now uses that brief.

## Requirement-to-design mapping

| Brief requirement | Current design fit | Gap / concrete improvement |
|---|---|---|
| Specific group and concrete need | Proposed indoor recreational boulderers deciding what to work on next | Validate that need with a few climbers; avoid pitching to all athletes and patients |
| Connect fragmented information | Climb logs, physical tests and hand/wellbeing records feed one profile | Demonstrate one explanation that references different records, rather than separate screens with unrelated summaries |
| Informed, active participation | Tappable shapes, evidence, user-selected focus and quest overrides | Explain why the action was selected and what is unknown; allow correction and skipping |
| Recognize activity/recovery patterns | Comparable-test history, activity records and symptom timeline | Show a longitudinal example with honest source/date labels; do not mistake correlation for cause |
| Sustainable habits adapted to circumstances | Small quests, symptom exclusions, no pet penalties for rest | Offer time/equipment-aware alternatives; reward appropriate check-ins as well as exercise |
| Accessibility and regular-use effort | Text chart summaries, manual entry, reduced motion, optional photos/tests | Verify a short check-in and an understandable next action with users; charts must remain useful without color or animation |
| Clear journey and practical value | Profile → focus → quest → follow-up | Merge the previously separate profile and pet demo flows into one complete scenario |
| Healthcare communication | Hand journal and export could support a user-confirmed appointment summary | Optional later extension; do not add diagnosis to satisfy a brief that does not require it |

The brief's suggested directions are examples. We do not need to implement caregiver sharing, healthcare preparation and every activity integration to qualify.

## Judging alignment

| Criterion | Assessment of the proposal | Best evidence to prepare |
|---|---|---|
| **Innovation (30%)** | Promising combination of style-specific understanding and an evidence-linked action loop; uniqueness is not established | Explain the specific decision improved beyond an ordinary climb log, generic radar or pet habit tracker; compare relevant alternatives before claiming novelty |
| **Category fit (20%)** | Strong: informed physical activity, wellbeing context and achievable action | One climber scenario connecting previously separate records to a useful next step |
| **Usability (20%)** | Good intention, with scope and routine-effort risks | Watch users interpret a chart, choose an action and complete a check-in; document misunderstandings and fixes |
| **Design (20%)** | Clear visual direction: terrain triangle, movement radar, monkey and jungle | A polished consistent screen with readable labels, missing-data states and accessible controls |
| **Completeness (10%)** | Unproven at product level; the existing scaffold is not the full experience | A working persistent loop with traceable explanations, quest completion and duplicate-XP handling |

These judgments concern fit, not numeric scores. Neither paper research nor the brief establishes that a mobility test can predict style-specific grades.

## Highest-value changes

1. **Lead with a decision, not a feature list.** “What should I focus on in my next climbing session, given my history and how I feel?” Put the answer and supporting evidence on the home screen.
2. **Use actual style-tagged climbing records.** Terrain/movement outcomes make the profile more defensible than translating flexibility or arm span directly into climbing ability. Keep preference, exposure and ability distinct.
3. **Show the information join.** A focus card should reference the observations used and explain whether a new wellbeing report changes task eligibility. Inputs may be manually entered; external APIs are not necessary to prove the idea.
4. **Make the next step small and feasible.** Show time, equipment and alternatives. Begin with assessment/reflection quests or reviewed practice content; add stretches only with an appropriate, reviewed mapping to the evidenced limitation.
5. **Make follow-up meaningful.** Show what the user tried, when evidence was collected and whether comparison is valid. Pet XP shows participation; the ability chart changes only with fresh evidence.
6. **Measure clarity and effort.** Ask climbers to identify a supported focus, an unknown area and the next action. Test the proposed sub-minute check-in. Record observations rather than declaring the app intuitive without evidence.

## Suggested demonstration

Working scenario: a recreational indoor boulderer wants a better next-session focus.

1. Open labeled prior climbing records and one comparable assessment; show source, date and missing areas.
2. Explain one supported style observation on the terrain triangle or movement radar. If scoring remains unvalidated, use an honest descriptive state rather than a fabricated ability number.
3. Select a focus. The monkey presents one eligible task and why it fits.
4. Add a current wellbeing/hand observation. Show affected loading suggestions paused and an eligible alternative offered. This demonstrates context changing a decision, not an injury diagnosis.
5. Log the chosen action once and show persistent XP or a level-up.
6. Add or inspect comparable follow-up evidence; show that participation and capability are separate. Historical sample data must be labeled.

For a 60-second video, compress this into the visible decision loop. A video is optional for sports under the supplied rules; it remains useful demonstration material.

## Scope recommendation

**First priority:** profile + style logging + one assessment/manual alternative + explained focus + one eligible quest + monkey XP + persistence. Make the visuals readable and connect the records.

**Supporting context:** a simple hand/wellbeing entry that changes eligibility. Add detailed photo comparison/heatmaps when the core loop is stable; these remain part of the full product idea.

**Stretch:** live pose inference, a real activity integration, richer hand history or the combined terrain-by-movement grid. Choose the addition that improves the decision most.

**Later:** broad form coaching, clinical symptom routing, diagnostic claims, calibrated grade predictions and personalized exercise prescriptions. These introduce validation work that is unnecessary for the open task's central need.

## Track and submission requirements

Sports has no required OS or native feature. Demonstrate on whichever host runs the full loop most reliably: an Android or iOS build and a functioning web prototype both fit the sports brief. A web demo does not prove a phone-only feature works.

Sports weights are **30/20/20/20/10** for innovation/category/usability/design/completeness. No criterion scores native platform capabilities.

Required track materials: title, team, 1 to 6 members, description and a PDF deck of at most 10 slides. Prepare to the supplied upload form's English requirements, five-word title limit, 500-word description limit and required gallery image. “Climbing Monkey” fits the title limit. Significant AI/external-resource disclosure is required; maintain the existing AI log.

Deadline: **4 October 2026, 11:00 PM**. Confirm the source discrepancy between HackTribe and Challenge Rocket and the suspicious 11:00 PM start-time wording with organizers.

## Suggested positioning

> Climbing Monkey helps recreational indoor boulderers turn climbing records, simple assessments and wellbeing check-ins into a clear picture of their climbing styles and one achievable next action. A jungle-themed monkey rewards consistent participation while the profile shows progress from actual evidence.

Use this as intended product value. The submission must clearly identify which parts work, which use sample data and which remain future features.
