# Huawei Challenge: Imagine What's Next (partner task — HarmonyOS / OpenHarmony)

**Prize pool:** 25,000 PLN — 1st 12,000 / 2nd 8,000 / 3rd 5,000. Prizes are split equally among team members and are subject to tax deductions. They are paid by PROIDEA within 60 days. Results are announced at the closing ceremony on 4 October.

## Challenge: a standout system feature or app for a new mobile OS

HarmonyOS is the first credible challenger to the two dominant mobile ecosystems. It runs on millions of phones, PCs and watches and is expanding beyond Asia.
- HarmonyOS itself is proprietary (Huawei).
- **OpenHarmony** is the open-source base, governed by the OpenAtom Foundation.
- **Oniro** is OpenHarmony's European distribution, governed by the Eclipse Foundation.

The pitch to Europe is **digital sovereignty**: being able to audit, patch and ship your own stack. Code written for Oniro also runs on HarmonyOS devices.

**Task:** design and build an innovative **system feature or mobile application for an OpenHarmony-based mobile device.** The idea should fit one or more of these themes (ideas that span themes are welcome):

- **Intelligent Experiences:** AI agents, contextual awareness, personalization, intelligent interaction, **on-device AI**.
- **Spatial Experiences:** spatial UI, 3D content, immersive media, sensing, positioning, new ways to interact with the physical environment.
- **Human-Centric Technology:** accessibility, digital wellbeing, inclusive design, education, cultural experiences, responsible technology.

The solution should show clear value, a functional implementation, and innovation that current platforms are missing.

## Technical requirements

**Allowed implementation paths:**
- native: **ArkTS + ArkUI**, or C/C++ platform APIs;
- cross-platform: e.g. **React Native for OpenHarmony (RNOH)** or another compatible framework;
- OpenHarmony or Oniro system development frameworks and source-level build tools.

**The final solution must:**
- target HarmonyOS, OpenHarmony or Oniro;
- target **API 20 or later**, declaring API 20 as the minimum where applicable;
- use an SDK and dev environment compatible with that platform version;
- **run on an OpenHarmony/HarmonyOS emulator or a compatible physical device**;
- include **reproducible setup, build and launch instructions**;
- **demonstrate the use or improvement of at least one platform, device or system capability.**

**Tooling:**
- Recommended (optional): DevEco Studio, SDK Manager, hvigor, HDC, app signing, and an emulator or device.
- Open-source alternatives are fine if the result is reproducible.

**Cross-platform submissions:**
- Must include an OpenHarmony/HarmonyOS target, plus the native container, bridge and build config needed to produce a working package.
- **An Android, iOS, web or desktop build alone is not enough.**

**"Improvement" submissions:**
- Deliver a ready-to-install app or component that adds or improves a capability **without modifying the system itself**.
- Explain what it does, how it integrates, how to install it, and how to verify it.

## Use of AI

AI dev tools are permitted and **strongly encouraged**: coding agents, assistants, MCP servers, Agent Skills, and so on. AI can run locally, remotely or in a hybrid setup.

**Any team that used AI tools or ships an AI feature must publish `AI_WORKFLOW.md`.**

- **For an AI feature, document:** the model or service, the inference flow, data handling, limitations, the validation approach, and privacy considerations.
- **For AI dev tools, document:**
  - every model, coding agent, MCP server, Agent Skill and AI tool used;
  - the main prompts, reusable instructions and relevant config;
  - the workflow from ideation and architecture through implementation, testing and debugging;
  - how generated output was reviewed, tested and validated;
  - known limitations, failed approaches and lessons learned.
- Document prompts and tool usage as fully as reasonably possible. **Remove API keys, credentials and personal data.**

## Required deliverables

1. Public source code repository
2. Reproducible setup, build, install and launch instructions
3. **A working `.hap` package**
4. A brief recorded demonstration
5. A concise architecture and implementation description
6. `AI_WORKFLOW.md` (if AI dev tools were used)
7. Extra AI integration docs (if the submission includes AI features)

**All materials must be in English.** Identify material pre-existing or third-party components and any use of AI tools.

## Evaluation criteria

Each juror scores every criterion from 1 to 10; the final score is the weighted average across jurors. These criteria replace the general HackYeah criteria. The jury may withhold prizes from solutions that score below 50%, and may invite teams to present.

- **Originality — 20%**
  - Is it a new idea, or a fresh take on a known problem? A port can count as original if it solves something non-obvious.
  - Combining challenge areas is a plus when the combination serves a purpose, e.g. on-device AI that makes a spatial interface accessible.
- **Demonstrated usefulness — 20%**
  - Who uses it, and what problem does it solve? Which area does it address?
  - The link to that area must be visible in what the solution does, not only in how it is described.
  - **A working narrow solution beats a broad concept on slides.**
- **Technical execution — 20%**
  - Does it work as described? Back claims with code, the demo, logs or tests.
  - Is the architecture sensible, with no components added just for show?
  - Is the code readable and modular, with error handling for API errors, timeouts, missing data, unexpected input and **incorrect model output**?
  - Are there some tests for the key scenarios?
  - Basic hygiene: no secrets in the repo, input validation, minimal permissions, no risky dependencies.
- **Use or enhancement of platform capabilities — 20%**
  - Does it really use system services, APIs and distributed features?
  - **An app that would run unchanged on another OS scores lower.**
  - Depending on the area, this could mean on-device AI and agent frameworks, sensors, positioning, 3D rendering, or accessibility and system services.
- **Quality of the demonstration — 10%**
  - Is it actually running, not mockups? The emulator is the expected default.
  - Make clear what was built during the hackathon.
  - If something can't run on the emulator (sensors, positioning), explain how it would work. Mentors have real devices on site.
- **Reproducibility and transparency — 10%**
  - Can someone build and run it from the README alone?
  - Are versions, SDKs and config documented?
  - **Does the commit history show progression?** Describe your AI tool usage.

Repositories may get an automated technical pre-review; the jury makes the final call.

## Rules summary

- The organizer is Huawei Polska sp. z o.o.; PROIDEA provides the platform and pays the prizes. Event: 3–4 Oct 2026, Tauron Arena Kraków.
- Teams of up to 6 registered participants. People involved in organizing or judging the challenge are excluded.
- The solution must be created or substantially developed during the challenge. Pre-existing code, templates, boilerplate and AI tools are fine if legally usable and disclosed.
- **IP:**
  - Teams keep ownership.
  - Accepting a prize grants Huawei a non-exclusive, royalty-free, 3-year licence to test, demo and promote the solution. **It does not cover commercial exploitation or integration into Huawei products.**
  - Every submitter grants Huawei and PROIDEA a 3-year licence to use the project name, team name, description, screenshots and recordings for promotion.
- **Disqualification grounds:** rule violations, late submission, false info, third-party rights infringement, fraud.
