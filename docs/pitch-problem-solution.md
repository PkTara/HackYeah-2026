# Climbing Monkey — problem and solution (pitch copy)

Date: 3 October 2026. Draft copy for the submission description (≤ 500 words) and deck (≤ 10 slides). Built from the [product design](climbing-app-design.md) and [alignment analysis](climbing-monkey-alignment.md). Both numbers link to their sources in the [table below](#sources).

## Throughline

> **No data → no diagnosis → no plan.** Climbers stall because nobody records what happens on the wall. Climbing Monkey makes recording it fun, and turns what you record into a diagnosis and a plan.

Both answers follow the same chain: **problem → play with the monkey → collect data → find your weaknesses → get your plan → repeat.**

## 1. Why we're building it

### Description-ready paragraph (~120 words)

> Climbing is booming. An IFSC-commissioned study estimates **44.5 million climbers** worldwide, and North America alone opened **53 new climbing gyms in 2025**. Behind those numbers are millions of recreational climbers who hit the same wall: after the first fast gains, progress stalls and they can't tell why. Is it footwork? Overhangs? Avoiding dynamic moves? Answering that takes data, and most climbers have none. Grades sit in one app, sessions on a watch, and how a move felt is forgotten by the drive home. A training log feels like homework, and few recreational climbers have a coach to keep one for them. **Without data there's no diagnosis, and without a diagnosis there's no plan**, so climbers keep repeating the problems they already like.

### Slide version

**Problem: climbers stall because they have no data**

- **44.5 M** climbers worldwide, and **53** new gyms in North America in 2025 alone
- After the beginner phase, progress stalls and nobody can say why
- Finding out needs data, but logging feels like homework, so nobody keeps a log
- **No data → no diagnosis → no plan → the same problems every session**

## 2. What we're building and why it helps

### Description-ready paragraphs (~230 words)

> **Climbing Monkey makes collecting that data the fun part.**
>
> **Play.** Meet your monkey companion. Each session he hands you quests, such as *send two slabs*, *try a dynamic move* or *tell me how your fingers feel*. Completed quests earn XP, level him up and unlock gear for his jungle.
>
> **Collect.** Every quest is also a data point. In a quick check-in you tag what you climbed by terrain (slab, vertical, overhang) and movement (controlled or dynamic), and whether you sent it. Optional guided tests (a camera-assisted mobility check, arm span) and a hand journal add context about your body.
>
> **Analyse.** That data draws your climbing shape. A **terrain triangle** and **movement radar** show where you're strong and where you struggle, and every point links back to the climbs behind it. Styles you haven't tried yet show as unknown, not as weaknesses.
>
> **Plan.** The monkey turns your biggest gap into a plan: one focus, the quests that train it and a reassessment that shows whether it worked. *Send most vertical problems at your grade but few overhangs? This week's quests target overhangs.* If you log a sore finger, finger-heavy quests pause and he suggests something else.
>
> Then the loop restarts: new quests, new data, a sharper picture. Climbers finally get an answer to *"what should I work on next?"*, and gyms get members who leave with a reason to come back.

### Benefits along the throughline

| Step | What the climber gets |
|---|---|
| **Play** | A reason to show up and log: the monkey makes tracking a game, not homework |
| **Collect** | A complete climbing history built without extra effort, one quest at a time |
| **Analyse** | A clear picture of strengths and weaknesses by style, backed by their own climbs instead of a single grade number |
| **Plan** | One focus and a concrete set of quests for the next sessions, adjusted when their body needs a break |
| **Repeat** | Visible progress: reassessment shows whether the plan worked, and the monkey keeps growing alongside them |
| *Gyms (customer)* | Members who leave each session with a plan for the next one |

### Slide version

**Solution: your monkey turns climbing into data, and data into a plan**

- **Play:** your monkey gives you quests; completing them levels him up
- **Collect:** each quest logs terrain, movement and result in a quick check-in
- **Analyse:** terrain triangle + movement radar show your strengths and gaps, backed by evidence
- **Plan:** one focus, targeted quests and a reassessment; sore fingers pause finger-heavy quests

## Keeping the pitch defensible

- **"Diagnosis" means climbing analysis, not medical diagnosis.** The hand journal pauses quests; it doesn't diagnose injuries or clear anyone to climb.
- **The monkey grows with participation; the profile changes only with new climbing evidence.** Completing a quest doesn't itself raise a style score.
- **No grade prediction.** The triangle and radar describe style strengths, not a predicted grade. Demo sample data is labeled.

## Before this goes into the submission

1. **Mark what's working.** The repository currently holds the platform scaffold, and the features above are the intended product. In the final description, say which parts the demo shows working, which use sample data and which are future work.
2. **Get one statistic of our own.** No published figure covers the "I've stalled and don't know why" problem. Ask 10–15 climbers at the venue or a Kraków gym: *"Do you know what you should work on next session?"* and *"Do you keep any record of your climbing?"* A line like "9 of 12 climbers we asked had no plan" is the strongest problem evidence we can add today. Report the sample size honestly.
3. **Open both source links once.** The development environment's proxy blocked direct page fetches. The figures were checked against search-indexed coverage, not the full pages.
4. **Mind the word budget.** The two answers are ~350 words together, which leaves ~150 for team names, emails and anything else.

## Sources

| Claim | Source |
|---|---|
| 44.5 million climbers worldwide (indoor + outdoor; 2018 estimate by Vertical Life for the IFSC) | IFSC, [About World Climbing](https://www.worldclimbing.com/ifsc); reported in [Climbing Business Journal](https://climbingbusinessjournal.com/ifsc-releases-its-2019-annual-report/) |
| 53 new climbing gyms opened in North America in 2025 (41 net after 12 closures; survey of 240 facilities) | Climbing Business Journal, [Gyms and Trends 2025](https://climbingbusinessjournal.com/gyms-and-trends-2025/) |
