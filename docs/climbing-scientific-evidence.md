# Climbing Monkey — scientific evidence and claim boundaries

Verified 3 October 2026. This is a research handoff for integrating citations into the app, not a clinical protocol or a claim that the app has been scientifically validated.

Scope checked against [app design](climbing-app-design.md), [backend design](backend-design.md), [profile derivation](../backend/src/climbing_monkey/profile.py), [pose geometry](../backend/src/climbing_monkey/pose.py), and the [Sport & Healthcare brief](../context/tracks/open-sport-healthcare.md). The brief supports connecting records with wellbeing and an achievable next action; it does not supply scientific validation of measurements, scoring, coaching, or medical advice.

## How to interpret this evidence

- **Supported:** the narrow statement is directly supported within the study's population, equipment, and protocol. This does not mean the app implementation is validated.
- **Indirect:** related research motivates a feature, but differs in task, population, instrument, outcome, or delivery.
- **Proposed:** a product or software rule chosen by the team, without a claimed research-derived threshold.
- **Unvalidated:** the app's measurement, inference, score, or intervention has not been validated for its intended use.

Association with climbing performance is not proof that changing a measurement will improve someone's climbing. Reliability is repeatability; validity concerns whether the measurement supports the intended interpretation. A reliable test may still be inappropriate for a different interpretation. Keep biological outcomes, climbing outcomes, and engagement rewards separate.

The 12 sources below are peer-reviewed **original investigations**, including one case report and one laboratory tissue experiment. No systematic review is used as primary evidence. If adding reviews later, label them **secondary evidence** and preserve links to the original studies supporting a technical claim. Reading depth is explicit; an accessible abstract is not recorded as a full-text appraisal. Summaries are paraphrased, with no reproduced figures or long quotations.

## Verified source registry

### `michailov2018` — instrumented finger strength and endurance

Michail L. Michailov, Jiří Baláš, Stoyan K. Tanev, Hristo S. Andonov, Jan Kodejška, Lee Brown. **Reliability and Validity of Finger Strength and Endurance Measurements in Rock Climbing.** *Research Quarterly for Exercise and Sport* 89(2):246–254, 2018. DOI: [10.1080/02701367.2018.1441484](https://doi.org/10.1080/02701367.2018.1441484). [PubMed original abstract](https://pubmed.ncbi.nlm.nih.gov/29578838/). Reading: **abstract only**.

Original measurement study: 22 male climbers in the arm-position comparison; 9 male climbers in repeatability testing. Instrumented force/time measures were repeatable, whereas fatigue index and rate of force development were less reliable. Arm fixation changed both measured force and its relationship with reported climbing ability. Supports standardized, instrumented test records. Small male samples, protocol dependence, and associations with ability limit generalization. It does not validate smartphone force estimates, arbitrary hang protocols, or individual grade predictions.

### `mermier2000` — anthropometry and physical performance

C. M. Mermier, J. M. Janot, D. L. Parker, J. G. Swan. **Physiological and anthropometric determinants of sport climbing performance.** *British Journal of Sports Medicine* 34(5):359–365; discussion 366, 2000. DOI: [10.1136/bjsm.34.5.359](https://doi.org/10.1136/bjsm.34.5.359). [PubMed original abstract](https://pubmed.ncbi.nlm.nih.gov/11049146/). Reading: **abstract only**; full-text archive was inaccessible during this check.

Cross-sectional study of 44 climbers (24 men, 20 women) across skill levels, tested on two progressively difficult artificial routes. A component of trainable characteristics explained substantially more performance variation than the anthropometric or flexibility components. This supports keeping reach/body proportions descriptive rather than ranking bodies as deficient. Components combine several variables; their explained variance is not the causal contribution of any single trait. Two routes and this sample do not establish universal determinants or a formula for the app's terrain scores.

### `draga2020` — flexibility is test-specific

Paweł Draga, Mariusz Ozimek, Marcin Krawczyk, Robert Rokowski, Marcelina Nowakowska, Paweł Ochwat, Adam Jurczak, Arkadiusz Stanula. **Importance and Diagnosis of Flexibility Preparation of Male Sport Climbers.** *International Journal of Environmental Research and Public Health* 17(7):2512, 2020. DOI: [10.3390/ijerph17072512](https://doi.org/10.3390/ijerph17072512). [Original article in PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7178254/); [PubMed](https://pubmed.ncbi.nlm.nih.gov/32272571/). Reading: **abstract and selected full-text methods excerpts**, not complete full text.

Cross-sectional investigation of 60 competitive male climbers at advanced through higher-elite levels (7b–9a redpoint). Straddle sit/stand measurements correlated with skill; the climbing-specific tests did not show significant correlations in this study. The straddle protocols used distances and specific positioning, not the app's ankle/hip angle. This supports defining exactly which mobility task is measured, but not a universal flexibility-to-grade conversion. Associations do not establish that stretching improves performance; the elite male sample differs from recreational indoor boulderers.

### `orth2018` — learning and movement repertoire

Dominic Orth, Keith Davids, Jia-Yi Chow, Eric Brymer, Ludovic Seifert. **Behavioral Repertoire Influences the Rate and Nature of Learning in Climbing: Implications for Individualized Learning Design in Preparation for Extreme Sports Participation.** *Frontiers in Psychology* 9:949, 2018. DOI: [10.3389/fpsyg.2018.00949](https://doi.org/10.3389/fpsyg.2018.00949). [Original full text](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00949/full). Reading: **full-text methods/results/discussion**.

Longitudinal practice investigation: 8 beginner climbers recruited, with 1 dropout, over 42 practice trials across 7 weeks. Changes in fluency and body-wall configurations differed between individuals. Supports recording practice context and revisiting observations rather than assuming one learning trajectory. The small, constrained route task does not validate the app's five radar axes, an automated technique diagnosis, or an AI-selected practice prescription. The study's motion analysis is not equivalent to a single phone photograph.

### `seifert2017` — route preview and movement

Ludovic Seifert, Romain Cordier, Dominic Orth, Yoan Courtine, James L. Croft. **Role of route previewing strategies on climbing fluency and exploratory movements.** *PLOS ONE* 12(4):e0176306, 2017. DOI: [10.1371/journal.pone.0176306](https://doi.org/10.1371/journal.pone.0176306). [Original full text](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0176306). Reading: **full-text methods/results/discussion**.

Observational experiment with 18 climbers (8 inexperienced, 10 experienced), previewing and top-roping one 10 m, French 5b route; gaze and five inertial sensors captured behavior. Preview patterns were associated with exploration and immobility during ascent. Supports a preview-and-reflection feature as a research-informed candidate. This was not a randomized test of an app intervention, and more previewing was not uniformly better. One route cannot establish a best preview strategy for all climbers or improve-grade guarantees.

### `stenum2021` — 2D pose validation depends on the task

Jan Stenum, Cristina Rossi, Ryan T. Roemmich. **Two-dimensional video-based analysis of human gait using pose estimation.** *PLOS Computational Biology* 17(4):e1008935, 2021. DOI: [10.1371/journal.pcbi.1008935](https://doi.org/10.1371/journal.pcbi.1008935). [Original full text](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008935). Reading: **full-text methods/results/discussion**.

Validation against simultaneous motion capture using a dataset of 32 healthy adults; 31 walking trials were analyzed after one exclusion. OpenPose estimated several gait measures from sagittal videos, with joint/task-dependent errors and perspective limitations. Supports reference comparison and controlled camera geometry for any new metric. It concerns OpenPose and walking, not MediaPipe and climbing or frontal leg spread. Its reported accuracy must not be transferred to this app. Occlusion, depth changes, and camera viewpoint remain measurement risks.

### `barzegar2024` — MediaPipe comparison with depth and calibration

Ali Barzegar Khanghah, Geoff Fernie, Atena Roshan Fekr. **Joint angle estimation during shoulder abduction exercise using contactless technology.** *BioMedical Engineering OnLine* 23:11, 2024. DOI: [10.1186/s12938-024-01203-5](https://doi.org/10.1186/s12938-024-01203-5). [Original full text](https://link.springer.com/article/10.1186/s12938-024-01203-5). Reading: **full-text methods/results/discussion**.

Validation study of 14 young healthy participants (8 women, 6 men), using LiDAR depth, MediaPipe/Cubemos skeleton tracking, and motion capture during shoulder abduction. Distance affected accuracy; personalized calibration improved results; Cubemos outperformed MediaPipe in this setup. This supports treating system configuration as part of a measurement protocol. It does not demonstrate comparable accuracy for uncalibrated RGB-only phone images, hip angles, or wall climbing. Personalized regressors and depth hardware differ materially from the current backend.

### `schweizer2001` — finger loading biomechanics

Andreas Schweizer. **Biomechanical properties of the crimp grip position in rock climbers.** *Journal of Biomechanics* 34(2):217–223, 2001. DOI: [10.1016/S0021-9290(00)00184-6](https://doi.org/10.1016/S0021-9290(00)00184-6). [PubMed original abstract](https://pubmed.ncbi.nlm.nih.gov/11165286/). Reading: **abstract only**.

In-vivo biomechanical measurements of 16 fingers in 4 participants used purpose-built devices to examine fingertip force and tendon bowstringing. Crimp geometry produced substantial pulley loading compared with the alternative grip examined. Supports recording grip/loading context separately from external hand appearance. A tiny mechanistic experiment cannot quantify a user's injury risk or diagnose a painful region. Its force relationships are specific to the studied conditions; the app cannot infer pulley force from pose landmarks or a hand photo.

### `klauser2002` — internal injury assessment used imaging

Andrea Klauser, Ferdinand Frauscher, Gerd Bodner, Ethan J. Halpern, Michael F. Schocke, Peter Springer, Markus Gabl, Werner Judmaier, Dieter zur Nedden. **Finger pulley injuries in extreme rock climbers: depiction with dynamic US.** *Radiology* 222(3):755–761, 2002. DOI: [10.1148/radiol.2223010752](https://doi.org/10.1148/radiol.2223010752). [PubMed original abstract](https://pubmed.ncbi.nlm.nih.gov/11867797/). Reading: **abstract only**.

Diagnostic imaging study in 64 injured high-level climbers, examining 75 symptomatic and 181 asymptomatic fingers. Dynamic ultrasound was compared with MRI; surgical correlation was available in 7 cases. Supports distinguishing a symptom journal from investigation of internal pulley structures. Selected patients, specialized equipment, and reference imaging differ from app users and photographs. The reported diagnostic performance must never be attributed to the app. This paper does not validate photo-based healing assessment, symptom-only diagnosis, or return-to-climb clearance.

### `paxton2012` — Baar-associated engineered tissue experiment

Jennifer Z. Paxton, Paul Hagerty, Jonathan J. Andrick, Keith Baar. **Optimizing an Intermittent Stretch Paradigm Using ERK1/2 Phosphorylation Results in Increased Collagen Synthesis in Engineered Ligaments.** *Tissue Engineering Part A* 18(3–4):277–284, 2012; online publication 2011. DOI: [10.1089/ten.TEA.2011.0336](https://doi.org/10.1089/ten.TEA.2011.0336). [PubMed](https://pubmed.ncbi.nlm.nih.gov/21902469/); [original article in PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3267962/). Reading: **abstract and selected full-text discussion excerpts**, not complete full text.

Laboratory experiment in engineered ligament constructs, with **no human participants**. Construct replicate counts were not independently verified from accessible primary methods; do not invent a human sample size. Brief cyclic loading and recovery intervals affected ERK1/2 signaling and collagen accumulation. The often-quoted 10-minute/6-hour schedule is an **in-vitro experimental regimen**, not an established climbing, hangboard, stretching, or rehabilitation dose. Cellular response in constructs does not establish injury prevention, tissue healing, or safe loading in a climber.

### `shaw2017` — Baar-associated nutrition and biomarkers

Gregory Shaw, Ann Lee-Barthel, Megan L. R. Ross, Bing Wang, Keith Baar. **Vitamin C–enriched gelatin supplementation before intermittent activity augments collagen synthesis.** *American Journal of Clinical Nutrition* 105(1):136–143, 2017; online publication 2016. DOI: [10.3945/ajcn.116.138594](https://doi.org/10.3945/ajcn.116.138594). [PubMed](https://pubmed.ncbi.nlm.nih.gov/27852613/); [original paper, UC repository](https://escholarship.org/uc/item/7042n9px). Reading: **full-text methods/results/discussion in the repository PDF**.

Randomized, double-blind crossover trial in 8 healthy men, plus an engineered-ligament serum bioassay. Supplement conditions affected circulating collagen-related amino acids and PINP; serum from 4 participants was used in the tissue bioassay. The authors explicitly discuss circulating PINP as likely reflecting **bone** synthesis rather than direct tendon synthesis. This is mechanistic evidence, not a climbing injury-prevention trial. It does not establish finger-pulley healing, recovery time, clinical benefit, or a supplement recommendation for app users.

### `baar2019` — patellar tendon case report

Keith Baar. **Stress Relaxation and Targeted Nutrition to Treat Patellar Tendinopathy.** *International Journal of Sport Nutrition and Exercise Metabolism* 29(4):453–457, 2019; online publication 2018. DOI: [10.1123/ijsnem.2018-0231](https://doi.org/10.1123/ijsnem.2018-0231). [PubMed original abstract](https://pubmed.ncbi.nlm.nih.gov/30299199/). Reading: **abstract only**.

Case report of **1 professional basketball player** with MRI-diagnosed patellar tendinopathy. A combined loading/nutrition program accompanied improved symptoms, performance, and follow-up MRI findings. A single case without a control cannot separate treatment components or establish general efficacy. The tissue, sport, and clinical supervision differ from finger symptoms in recreational climbers. This supplies context for tendon research, not an app rehabilitation protocol or evidence that a hand photograph reveals healing.

## Feature-to-claim ledger

These entries cover the current design and backend. Source IDs indicate related evidence; they are not seals of validation. Product rules may be sensible without being experimentally proven.

| Feature or proposed interpretation | Status | Evidence / boundary | Safe in-app wording | Do not claim |
|---|---|---|---|---|
| Instrumented finger strength/endurance record | Supported for the published protocol; indirect for a new protocol | `michailov2018`; require actual force-measuring equipment, units, grip/edge, arm position and duration | “Recorded result for this test and setup.” | “The camera measured your grip force” or “This predicts your grade.” |
| Pull-up repetitions, hold duration, pulling strength/endurance | Proposed record; unvalidated conversion | Record task performance. Timing/counting differs from force or power measurement; no app-specific protocol validated here | “You recorded 6 repetitions under these conditions.” | “6 repetitions equals 80% climbing strength.” |
| Comfortable leg-spread result | Unvalidated as flexibility assessment | `draga2020`, `stenum2021` are context only; current formula is described below | “Estimated leg-spread angle in this image.” | “Validated hip mobility,” “true split angle,” “slab ability,” or improved flexibility from one capture. |
| Shoulder reach/overhead range; left/right comparison | Indirect; app protocol unvalidated | `barzegar2024`; different depth/calibration setup | “Camera estimate for this recorded movement.” | Diagnostic restriction, injury risk, or the paper's accuracy for this app. |
| Manual height/arm span and reach ratio | Supported as descriptive measurements; unvalidated performance inference | `mermier2000`; preserve method and units | “Your entered arm span is …; ratio ….” | “Your body proportions are a weakness” or fixed potential/grade ceiling. |
| Camera-derived height/arm span | Unvalidated | Requires dimensional calibration and reference comparison | “Not assessed” until a validated method is available | Real-world distances from uncalibrated landmarks. |
| Slab/vertical/overhang triangle, controlled/dynamic indicators and combined grid | Proposed presentation of logs; unvalidated ability scale | Current backend gives completion counts/rates and evidence IDs, with `ability_score: null` | “Completed 2 of 4 logged overhang climbs.” | Universal ability percentages or terrain grades. Differences may reflect exposure, route difficulty or selection. |
| Footwork/balance/body tension/sustained effort/dynamic coordination radar | Unvalidated axes/scales | `orth2018` does not validate these scores; current backend intentionally returns null for all five | “Not assessed” / “Example profile” for sample artwork | Replacing null with zero, mapping flexibility into technique, or closing a measured polygon through unknown axes. |
| A lower completion rate identifies a reflection focus | Proposed heuristic | Backend threshold of 3 records is a team rule, not a scientific minimum | “Review these logged outcomes; they do not establish a physical limitation.” | “Your weakest terrain” or a prescribed physical remedy from completion rate alone. |
| Comparable assessment trends | Supported principle; app change interpretation unvalidated | `michailov2018`; matching protocol/method/unit is necessary, not sufficient | “Recorded value changed by … under matching recorded conditions.” | “Meaningful improvement” without measurement error and repeatability data. |
| Route preview/reflection | Indirect candidate | `seifert2017`; no validated app intervention | “Record your intended sequence, then reflect on what changed.” | Guaranteed improvement or one scientifically optimal preview strategy. |
| Form coach / video annotations | Indirect research motivation; app inference unvalidated | `orth2018`, `stenum2021`, `barzegar2024`; wall angle, depth, occlusion and capture quality matter | “Candidate observation; confirm or correct.” | Automatic expert coaching, clinical joint assessment, injury prediction or verified technique scores. |
| Hand photo timeline, map, heatmap and symptom summary | Proposed documentation feature | `klauser2002` distinguishes internal imaging; `schweizer2001` supplies loading context. No journal-efficacy study in this set | “User-reported discomfort”; “Photos document visible changes.” | Injured-structure identification, healed tissue, recovery deadline, or clearance from photos. |
| Symptom flags pause relevant exercise suggestions | Proposed conservative eligibility rule | This is software behavior, not diagnosis or a proven injury-prevention intervention | “Loading suggestions are paused because you reported discomfort.” | “Safe to climb” after a zero rating; no report does not establish no injury. |
| Guided pain questions, pressure tests or care routing | Unvalidated; future clinical content | The imaging study does not validate home provocative tests. No clinician review has been completed or established here | “Save observations and prepare a summary to discuss with a professional.” | Diagnosis, treatment, pressure/load testing instructions, or invented clinician approval. |
| Tendon education drawing on Keith Baar | Indirect mechanistic/case evidence | `paxton2012`, `shaw2017`, `baar2019`; always show study type | “Research context: laboratory tissue study / biomarker trial / single case.” | Universal 6-hour recovery requirement, a climbing loading recipe, supplement advice or finger-rehab prescription. |
| Personalized stretching/practice quests | Proposed; intervention unvalidated | `draga2020` correlations do not prove stretching efficacy; `orth2018` does not validate automated selection | Assessment, logging and reflection quests can run now. Exercise content awaits a defined, reviewed library | Stretch dosage, guaranteed slab/dyno gains, or “clinically reviewed” without documented review. |
| Activities, wearable/health imports, fatigue/sleep | Proposed context | No study here validates activity minutes or sleep as a finger-load/readiness score; provider capability is separate | “Activity context, source and timestamp.” | General exercise time equals finger load, recovery or ability. |
| Monkey XP, levels, rewards and optional streaks | Proposed game rules | Participation rewards; no intervention or habit-efficacy trial in this set | “Quest completed: participation XP earned.” | XP means stronger tendons, improved mobility or increased ability. |
| AI explanations, privacy, exports, accessibility | Proposed product/engineering behavior | These papers do not validate the AI, security, usability, accessibility or clinical effectiveness of this product | Explain recorded evidence and limitations; allow correction/deletion | “Scientifically validated AI” from citations to related papers. |

## The current pose metric: exact meaning

`analyze_landmarks` takes left/right hip and ankle coordinates, forms the hip midpoint, and computes the image-plane angle between vectors from that midpoint to each ankle. Image dimensions correct the normalized-coordinate aspect ratio; absent dimensions assume a square plane. It does not use thigh/pelvis anatomical axes or estimate separate hip-abduction angles. Bent knees, limb lengths, camera viewpoint and out-of-plane motion can change the result. It is **ankle-to-hip-midpoint geometry**, not a validated flexibility test or true 3D joint range.

The response's `confidence` is the minimum landmark visibility of those four points. A visibility value of 0.9 must not be described as 90% angle accuracy, an error bound, or clinically meaningful confidence. Rejecting poor captures helps input quality but does not validate accepted results. Scientific error estimates require testing this exact model, formula, protocol, hardware and intended population against a reference. [Pose validation context](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008935) illustrates task-specific comparison, not an accuracy certificate for this backend.

Keep `front-facing-leg-spread-v1`, capture dimensions, model/version, method and quality information attached to a saved assessment. Even matching metadata cannot by itself establish real change: repeatability and error thresholds are still missing. No cited paper validates a flexibility-to-terrain mapping.

## Citation placement and linking

Use short, local explanations near the relevant result; keep the paper detail one tap away. A generic bibliography alone should not imply that every app claim is supported.

| Location | What the user should see |
|---|---|
| Assessment setup/result | Method, equipment, protocol and “Measured / Camera estimate / Self-reported,” followed by a “Research and limitations” link. |
| Terrain/radar detail | Underlying record IDs, date/count/context, scale definition or “Not assessed,” then the claim's evidence status. Raw user logs are the evidence for personal outcomes. |
| Trend detail | Matching recorded conditions and raw values; no significant-change badge until error thresholds exist. |
| Hand journal | “User-reported discomfort” and a quiet explanation that photos do not assess internal healing. Research links belong in the explanation, not in a diagnostic result. |
| Quest rationale | The personal observation that triggered the task; a separate citation explains background research. Mark the selection threshold as a product rule. |
| Tendon education | Study-type badges prominently distinguish laboratory, biomarker and single-case findings before any summary. |
| About / evidence library | Searchable source list with citation ID, title, authors, year, journal, DOI, original URL, study type, sample, reading depth, limits and verification date. |

Stable pattern: `claim_id → source_ids[] → source registry → doi/original_url`. Keep personal `evidence_ids[]` separate from scholarly `source_ids[]`; one identifies the user's records and the other published research. In Markdown, use [`michailov2018`](#michailov2018--instrumented-finger-strength-and-endurance); in the app, use a stable source-detail route such as `/evidence/sources/michailov2018`. Link the original paper from that view. Do not use web-search result IDs or ephemeral browser URLs.

## Proposed structured manifest examples

These examples are a handoff contract, not implemented schemas or live scoring code. Populate the registry from the verified entries above; do not fill a missing sample count with zero or infer a review date. A review record and research verification are separate.

```json
{
  "id": "baar2019",
  "title": "Stress Relaxation and Targeted Nutrition to Treat Patellar Tendinopathy",
  "authors": ["Keith Baar"],
  "year": 2019,
  "journal": "International Journal of Sport Nutrition and Exercise Metabolism",
  "doi": "10.1123/ijsnem.2018-0231",
  "original_url": "https://pubmed.ncbi.nlm.nih.gov/30299199/",
  "study_type": "case_report",
  "population": "professional basketball player with patellar tendinopathy",
  "samples": [{"purpose": "case report", "n": 1}],
  "reading_depth": "abstract_only",
  "verified_at": "2026-10-03",
  "supports_claim_ids": ["tendon_research_context"],
  "limitations": ["Single uncontrolled case", "Patellar tendon rather than finger pulley", "Does not validate app rehabilitation"],
  "clinical_content_review": null
}
```

```json
{
  "claim_id": "camera_leg_spread_geometry",
  "status": "unvalidated",
  "source_ids": ["draga2020", "stenum2021"],
  "source_relationship": "background_only",
  "safe_copy": "Estimated leg-spread angle in this image.",
  "prohibited_interpretations": ["validated hip mobility", "slab ability", "clinical range of motion"],
  "app_validation": null,
  "personal_evidence_ids": ["assessment-record-id"],
  "review": null
}
```

## What remains unresolved before stronger claims

1. Select exact strength/endurance/mobility protocols and appropriate equipment; determine repeatability, reference agreement and useful error limits in the intended recreational audience. Published validity does not transfer automatically to altered tests.
2. Validate the current angle implementation and its interpretation; until then keep “image-plane estimate.” Obtain complete primary text before relying on unverified Paxton construct counts or finer Draga protocol details. Abstract-only sources support only the stated narrow summaries.
3. Define observable technique variables and scoring scales before filling radar axes. Establish a dataset and validation plan for any terrain/grade prediction. Three logged climbs and completion rates are product heuristics, with confounding by grades, gyms, route choice and exposure.
4. No evidence here establishes the effectiveness of personalized app quests, gamification, hand journaling, symptom-driven suggestion pausing, or AI coaching. Evaluate those as product hypotheses rather than attaching a paper to imply efficacy.
5. Any exercise library or symptom-based clinical flow needs real, documented content review and its own evidence. No review has been invented here. Do not introduce treatment/stretch dosage, provocative self-tests, photo-based healing estimates or automatic return-to-climb decisions.

For the hackathon, the defensible story is: **a profile grounded in the climber's recorded observations, accompanied by clearly scoped research and honest unknowns**. It is not a validated diagnostic, grade-prediction or rehabilitation system.
