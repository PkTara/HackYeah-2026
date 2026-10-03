# Climbing Monkey — problem and solution (pitch copy)

Date: 3 October 2026. Draft copy for the submission description (≤ 500 words) and deck (≤ 10 slides). Built from the [product design](climbing-app-design.md) and [alignment analysis](climbing-monkey-alignment.md). Every number links to its source in the [table below](#sources).

## 1. Why we're building it

### Description-ready paragraph (~140 words)

> Climbing is booming: an IFSC-commissioned study estimates **44.5 million climbers** worldwide, and North America alone opened **53 new climbing gyms in 2025**. For a recreational boulderer, though, the information that should guide training is scattered. Grades sit in a logbook, sessions on a watch, and a sore finger is remembered only when it hurts. None of it answers the question asked before every session: *what should I work on next?* So climbers repeat the styles they already like and push through warning signs in a sport that loads the fingers hard. In one survey, **76.6% of recreational climbers reported a climbing injury**, most often joint pain or pulley or tendon injuries, yet **fewer than half saw a healthcare provider**. At a specialist clinic, **77.1% of 633 climbing injuries** were in the upper extremities, and finger injuries were the most common.

### Slide version

**Problem: climbers have data but no direction**

- **44.5 M** climbers worldwide; **+53** new gyms in North America in 2025 alone
- **76.6%** of recreational climbers report a climbing injury, but **< 50%** see a professional
- **77.1%** of climbing injuries hit the arms and hands; fingers are the most common site
- Grades, sessions and pain live in different places, and none of them says what to train next

### Supporting context (backup slide or Q&A)

- **31% of adults (1.8 billion)** did not get enough physical activity in 2022, and WHO projects 35% by 2030. A sport people enjoy is worth keeping them in, safely.
- **Fewer than 40% of surveyed healthcare providers** felt they had a comprehensive understanding of climbing injuries. A dated, specific hand journal makes the appointment conversation easier.
- **73% of North American gym operators** reported worsening economic conditions in 2025. Member retention matters to gyms, a possible future customer.

## 2. What we're building and why it helps

### Description-ready paragraph (~130 words)

> **Climbing Monkey** turns those scattered records into one visual profile and one achievable next step. After a session, the climber tags each problem by terrain (slab, vertical, overhang) and movement (controlled or dynamic) and marks whether they sent it. A **terrain triangle** and **movement radar** show where their climbing is strong and where evidence is missing, and every statement links back to the climbs or assessments behind it. A **monkey companion** offers one quest for the chosen focus, such as trying two vertical problems or completing a missing assessment. If the climber logs a sore finger in the **hand journal**, finger-loading quests are paused and a safe alternative is offered. Completing quests levels up the monkey. Only new evidence changes the profile, and rest days never cost progress.

### Benefits

| For | Benefit | Why it's credible |
|---|---|---|
| Climber | **Knows what to work on.** One focus, explained in plain language, instead of a single grade number | Style evidence comes from their own logged climbs; unknown styles show as "not assessed", not as weaknesses |
| Climber | **Trains around pain, not through it.** A wellbeing check-in changes what is suggested, so they don't get a finger-loading quest for a sore finger | Symptom flags pause affected quests by explicit rule; the dated journal is ready to show a physio |
| Climber | **Stays motivated.** The monkey rewards showing up, reflecting and resting well, not volume or pain | Gamified interventions had a small-to-medium positive effect on physical activity across 16 RCTs (Hedges g = 0.42) |
| Climber | **Low effort, private by default.** A quick post-session check-in works without wearables, a camera or an account | Manual entry first; on-device storage is the design default |
| Gym / coach *(future customer, hypothesis)* | Members leave each session with a plan for the next one, a reason to come back | Not yet validated; ties to gyms' retention pressure above |

### Slide version

**Solution: one profile, one next step, one happy monkey**

- **Log** a session in a quick check-in: terrain, movement, sent or not
- **See** your style shape: terrain triangle + movement radar, every point backed by evidence
- **Act** on one quest from your monkey, paused automatically if your fingers hurt
- **Grow**: the monkey levels up with participation; your profile changes only with new evidence

### What we deliberately don't claim

No grade prediction, no diagnosis, no medical clearance. Camera results are estimates, and sample data in the demo is labeled. Saying this out loud builds trust with judges who know the sport or medicine.

## Before this goes into the submission

1. **Mark what's working.** The repository currently holds the platform scaffold; the features above are the intended product. In the final description, say which parts the demo shows working, which use sample data and which are future work.
2. **Get one statistic of our own.** No published figure covers the core "what should I train next?" need. Ask 10–15 climbers at the venue or a Kraków gym two questions: *"Do you have a clear plan for what to work on next session?"* and *"Do you keep climbing when a finger hurts?"* A number like "9 of 12 climbers we asked had no plan" is the strongest problem evidence we can add today. Report the sample size honestly.
3. **Open each source link once.** The development environment's proxy blocked direct page fetches. Figures were checked against search-indexed abstracts and coverage, not the full texts.
4. **Mind the word budget.** The two paragraphs are ~270 words together, which leaves ~230 for "how it works", team names and emails.

## Sources

| Claim | Source |
|---|---|
| 44.5 million climbers worldwide (indoor + outdoor; 2018 estimate by Vertical Life for the IFSC) | IFSC, [About World Climbing](https://www.worldclimbing.com/ifsc); reported in [Climbing Business Journal](https://climbingbusinessjournal.com/ifsc-releases-its-2019-annual-report/) |
| 53 new gyms in North America in 2025; 4.7% net gym growth; 73% of operators reported worsening economic conditions (survey of 240 facilities) | Climbing Business Journal, [Gyms and Trends 2025](https://climbingbusinessjournal.com/gyms-and-trends-2025/) |
| 76.6% of recreational climbers reported ≥ 1 injury (most often joint pain, pulley and flexor-tendon injuries); fewer than half sought care; < 40% of providers felt they had a comprehensive understanding of climbing injuries | Dual survey of recreational climbers and healthcare providers on finger, hand and wrist injuries, [BMJ Open Sport & Exercise Medicine 12(2): e003239](https://bmjopensem.bmj.com/content/12/2/e003239) |
| 633 injuries in 436 patients (2017–18); 77.1% upper extremity; finger injuries (tenosynovitis, pulley lesions) most common | Lutter C. et al., "Current trends in sport climbing injuries after the inclusion into the Olympic program", *Muscles, Ligaments and Tendons Journal* 10(2): 201–210, 2020 ([record](https://cris.fau.de/publications/239704795)) |
| 31% of adults (1.8 billion) insufficiently active in 2022; projected 35% by 2030 | WHO, [news release, 26 June 2024](https://www.who.int/news/item/26-06-2024-nearly-1.8-billion-adults-at-risk-of-disease-from-not-doing-enough-physical-activity) (Lancet Global Health study) |
| Gamification: 16 RCTs, 2,407 participants, Hedges g = 0.42 on physical activity | Mazeas A. et al., [JMIR 2022; 24(1): e26779](https://www.jmir.org/2022/1/e26779) |
