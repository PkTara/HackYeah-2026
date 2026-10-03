# AI Control Layer (partner task — sponsor: PROIDEA)

**Prize pool:** 15,000 PLN — 1st 6,000 / 2nd 5,000 / 3rd 4,000 (gross)

> Build a flexible AI control layer to secure and govern interactions with Agentic AI systems (AI agents, MCP services, LLMs, APIs). This layer will help organizations protect data, apply required guardrails, manage API budgets, and block emerging exploits while maintaining developer speed. Create the ultimate hybrid defense system for the generative AI era!

## 1. Context

Developers and business processes now use AI and agentic AI everywhere: to write code, draft documents, analyze data and automate work. Traditional security tools are not built for the risks this creates:

- **AuthN/AuthZ for agents.** Without local enforcement, agents can access resources they shouldn't, impersonate other actors, and take harmful, irreversible actions.
- **Input validation / output filtering.** AI systems treat natural language as execution logic, which makes them vulnerable to **prompt injection**. Without output filtering they can return **sensitive data**.
- **Memory and resource consumption.** Persistent context or shared memory can trigger unauthorized data retrieval. Agents can get stuck in **runaway loops**, and their non-deterministic behavior can cause unexpectedly high resource use.

Organizations need a flexible control layer: a "smart intermediary" with guardrails that can inspect, redact or block unsafe interactions in real time. It should use a **hybrid** of traditional policy enforcement and AI-supported enforcement.

> The threats above are only examples. Analyze the ecosystem deeply, review sources such as **OWASP** (e.g. the OWASP Top 10 for LLM Applications and the Agentic AI threats guidance), and decide which other controls a comprehensive, production-ready defense needs.

## 2. Challenge

- Build a **lightweight, flexible AI Control Layer**: a gateway, proxy, middleware or SDK wrapper that intercepts and governs interactions with AI systems.
- It must enforce **security, privacy and resource controls** defined in a **centralized configuration source** (e.g. a control catalog).
- It must generate **reporting for security teams and for management** (UI or otherwise).
- It must use a **hybrid defense architecture**: non-AI deterministic controls (fast) plus AI-based semantic controls (deep understanding).
- It must manage **budgets for both external commercial APIs and locally hosted models**.
- It must detect or mitigate **known historical attacks on AI infrastructure**. Attack signatures can be fed in from an externally managed system.
- It must ship a **complete automated test suite** with both positive (allowed) and negative (blocked/redacted) cases.

## 3. Expected outcome / deliverables

1. **The AI Control Layer.** A functional gateway, proxy, middleware, SDK wrapper or other component that is easy to integrate into AI communication: agent↔agent, app↔agent, agent↔MCP, agent↔model, and so on.
   - You may build your own agent or use an existing one for the showcase.
   - Include a **simple architecture diagram**.
2. **Sample configuration.** A documented policy file that configures the controls. It should show **different strictness/adherence levels** and **budget rules**.
3. **Simple interactive dashboard.** Shows the controls, overall security posture, blocked threats, and metrics such as resource consumption and cost.
4. **Executable test suite.** Ready to run. Verifies the controls, including **budget limits and exploit mitigation**.

## 4. Formal requirements

1. **Centralized policy engine.** One config source (a file or a system) that manages:
   - the controls
   - sensitivity thresholds (Block vs Redact, or an adherence %)
   - the allowed LLM models
   - resource and financial budgets
2. **Controls / guardrails:**
   - **Deterministic (non-AI):** e.g. pattern matching for PII and secrets, authentication and access checks.
   - **Semantic (AI-based):** use AI models to secure interactions where possible.
3. **Budget and resource governance.** Enforce limits on resource access, compute time and token spend.
4. **Historical attack mitigation.** Detect and block patterns from known successful exploits, such as malicious code execution, **unsafe deserialization** (e.g. pickle model files), and **supply-chain attacks on model repositories**.
5. **Security reporting and auditing:**
   - real-time metrics (blocked interactions, budget usage) for management
   - **exportable audit logs** that security teams can use to analyze threats, policy violations and usage
6. **Self-testing suite.** Automated tests that verify both allowed and blocked cases.

## 5. Technical requirements

- Any stack: Go, Rust or Python from scratch, or built on existing open-source tools. **Check their licences.**
- The agents, LLMs and apps that use the layer can be off-the-shelf. **They are not assessed**; only the control layer is.

## 6. How it will be tested

- Judges **run your automated test suite**, which must contain both positive and negative cases.
- Judges may **interactively test the running layer with spontaneous, ad-hoc prompts**.
- Judges may **modify the config or feeds** (change rules, remove controls, adjust thresholds) to see how the layer reacts. They are checking whether changes take effect and whether they apply **in real time**.
- You should be able to produce **performance telemetry** on request.
- Judges also review the architecture, the dashboards, and the logs prepared for management and security teams.

## 7. Resources

- **Nothing is provided:** no datasets, proprietary APIs or hardware.
- Use open-source libraries, **local models (e.g. via Ollama)** and test prompts you write yourself.
- **No paid subscriptions** (OpenAI, Anthropic, Copilot, etc.) are provided. The whole system must design, build and run on your own setup.

## 8. Evaluation criteria

| Criterion | Rules PDF (binding) | Description PDF |
|---|---|---|
| Robustness of the Solution and Quality of Guardrails | 30% | 30% |
| Architecture and Performance Efficiency | 20% | 20% |
| Security Reporting | 20% | 20% |
| Completeness of the Self-Testing Suite | **20%** | **15%** |
| Practical Implementability and Scalability | **10%** | **15%** |

## Rules summary

- Team of 1–6. Submit the title, team name, members, description, and a PDF of 10 slides or fewer, plus optional extras. English or Polish.
- Judging has two phases: a mentor commission, then a live pitch for finalists. You need ≥50% in phase 1 to win a prize.
- Copyright stays with the authors.
