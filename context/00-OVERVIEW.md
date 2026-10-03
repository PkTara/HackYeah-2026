# HackYeah 2026 — Context Overview (start here)

LLM-friendly digest of all hackathon materials. Original PDFs are in `source-pdfs/`; full per-track details are in `tracks/`.

## Event facts

- **Event:** HackYeah 2026, 3–4 October 2026, Tauron Arena Kraków. Organizer: PROIDEA sp. z o.o.
- **Teams:** 1–6 people, all registered HackYeah participants.
- **Deadline:** submit by **11:00 AM, 4 October 2026**. Edits after the deadline are ignored.
  - The rules PDFs say 11:00 PM, but the confirmed deadline is **11:00 AM**. Plan for 11:00 AM.
- **Start:** the rules say work may start "no earlier than 11:00 PM on October 3rd". This is almost certainly a typo for 11:00 AM. Confirm with the organizers if it matters.
- **Submission platform:** the rules PDFs say **HackTribe**; the open-task descriptions say **Challenge Rocket**. Use whichever the organizers point to.
- **Language:** English or Polish for most tracks. **Huawei requires English.** The general upload form also asks for English, so default to English.
- **Two-phase judging (all tracks except Huawei):**
  1. A commission of at least 3 mentors scores the submissions on the platform.
  2. Finalists pitch live to a jury.
  - A project needs **at least 50% of the points in phase 1** to win a prize. Jury decisions are final.
- **Jury names** will be posted on the HackYeah Discord by 4 October.

## Track comparison

| Track | File | Sponsor | Prize | Judging weights | Hard requirements beyond the base submission |
|---|---|---|---|---|---|
| **AI Control Layer** | [tracks/ai-control-layer.md](tracks/ai-control-layer.md) | PROIDEA | 15,000 PLN (6k / 5k / 4k) | Guardrail robustness 30, Architecture & performance 20, Security reporting 20, Test suite 20*, Implementability & scalability 10* | Gateway/proxy/SDK; policy config file; dashboard; automated test suite run by the judges; architecture diagram; must run fully locally (no paid APIs are provided) |
| **Finance Without Intermediaries (Solana)** | [tracks/blockchain-solana.md](tracks/blockchain-solana.md) | Superteam Poland | 11,300 PLN | Relevance 30, Completeness & functionality 25, Idea & problem 20, Implementation potential 15, Originality 10 | Working dApp on Solana (devnet is fine); trust logic **on-chain**; live demo with a confirmed transaction; video up to 3 min; public repo with a README; design rationale |
| **Huawei: Imagine What's Next (HarmonyOS)** | [tracks/huawei-harmonyos.md](tracks/huawei-harmonyos.md) | Huawei Polska | 25,000 PLN (12k / 8k / 5k) | Originality 20, Usefulness 20, Technical execution 20, Platform capabilities 20, Demo quality 10, Reproducibility 10 | App or system feature for OpenHarmony/HarmonyOS/Oniro, API 20+; working `.hap`; runs on an emulator or device; public repo; recorded demo; `AI_WORKFLOW.md`; English only |
| Open: Artificial Intelligence | [tracks/open-ai.md](tracks/open-ai.md) | PROIDEA | 8,000 PLN | Open-task criteria (below) | None beyond the base submission |
| Open: ImpactHer — Technology for Real Change | [tracks/open-impacther.md](tracks/open-impacther.md) | PROIDEA | 8,000 PLN | Open-task criteria | None beyond the base submission |
| Open: Defence | [tracks/open-defence.md](tracks/open-defence.md) | PROIDEA | 8,000 PLN | Open-task criteria | None beyond the base submission |
| Open: Smart City | [tracks/open-smart-city.md](tracks/open-smart-city.md) | PROIDEA | 8,000 PLN | Open-task criteria | ⚠ Description PDF missing (the file is a copy of the rules) |

\* The AI Control Layer **rules** PDF gives Test suite 20% and Implementability 10%. Its **description** PDF gives 15% and 15%. The rules are the binding legal document.

**Open-task criteria** (shared by all four open tasks): Idea & Innovation 30%, Relation to Category 20%, Practical Applicability / Usability 20%, **Design (visual appeal) 20%**, Completeness & Implementation Value 10%. Full definitions are in [tracks/open-tasks-common.md](tracks/open-tasks-common.md).

## Base submission (all tracks)

From `ProjectSubmissionUpload.md` and the rules PDFs:

| Field | Required? | Constraints |
|---|---|---|
| Category | Yes | The track you are entering |
| Title | Yes | English, **5 words or fewer** |
| Team name and member list | Yes | 1–6 members. Put names, surnames and emails in the description |
| Description | Yes | English, **500 words or fewer**. Aim for about 3 paragraphs: the problem, how you solve it, how it works. Skip background history |
| Image gallery | Yes | **At least 1 image** (screenshots, prototype UI, mock-ups) |
| Presentation | Yes | **PDF** (optionally also PPTX), English, **10 slides or fewer**. An "online pitch" with mock-ups and screenshots |
| Video URL | Optional* | **60 seconds or less**, English. *Solana requires a video of up to 3 min; Huawei requires a recorded demo |
| Demo link | Optional | Include login details |
| Repository URL | Optional* | One public repo, with modules in separate folders (e.g. `api/`, `web/`, `mobile/`). *Required by Solana, Huawei and, in practice, AI Control Layer (the judges run the tests) |
| How to open the project | Optional | Setup instructions for the judges. Strongly recommended |

## Cross-cutting rules

**Use of AI tools** is allowed in every track.
- Disclose significant use of AI tools and of external models, APIs, datasets and libraries.
- The team must be able to **explain and defend every part of the code, including AI-generated parts**. Features the team cannot explain hurt the technical score.

**Pre-existing work** is allowed (libraries, boilerplate, templates) if licences permit.
- Clearly separate what was built during the hackathon from what existed before.
- Presenting prior work as new can lead to disqualification. Cite the resources you used.

**IP:** teams keep the copyright in every track. Huawei only receives a non-commercial licence for demonstration and promotion, and only if you accept a prize.

## Strategy notes (derived from the criteria)

- **Open tasks:** Design counts for 20%, so visual polish matters. Innovation is the largest weight at 30%.
- **Solana:**
  - The judges value a working end-to-end flow over polish ("the interface can be rough").
  - Prepare answers to these questions:
    - Where exactly does the intermediary disappear in the code?
    - What happens if one party disappears halfway?
    - Who holds which permissions after deployment?
    - **Why use a blockchain instead of a database?**
- **AI Control Layer:**
  - The judges will run your tests, send ad-hoc attack prompts, and **edit the config live**. Hot reload of the policy is a big win.
  - Have performance telemetry ready.
  - Use local models only (e.g. Ollama).
- **Huawei:**
  - Must actually use platform-specific APIs. A generic cross-platform app scores low on 20% of the criteria.
  - Commit history and the `AI_WORKFLOW.md` documentation are scored.
- **Everywhere:** the pitch is live, so have a backup recording, funded wallets and similar preparation ready.
