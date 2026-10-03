# Finance Without Intermediaries (partner task — Superteam Poland / Solana)

**Prize:** 11,300 PLN (gross). Sponsor: SUPERTEAM Sp. z o.o., Warsaw.

> Imagine a transaction with someone you don't know. No history, no reputation, no way to go after them if they disappear with your money. Blockchain makes this irrelevant: the terms execute themselves, regardless of what the other party wants. Put this capability to use in an application.

(The source PDF contains the same text in English and Polish. Only the English version is reproduced here.)

## 1. Context

Superteam is a non-profit that supports builders on Solana in more than a dozen countries. It connects people with grants, mentors and teams.

Most finance depends on trusted intermediaries: banks, credit institutions and payment operators. They charge fees, decide who gets served, can block or reverse transactions, and when they fail, everyone stops. Blockchain replaces trust in an institution with trust in code that anyone can read, running on a network where no single party decides the outcome. Solana confirms a transaction in a fraction of a second for a fraction of a cent. That makes previously uneconomic things viable: **micropayments, per-second settlements, and automatic revenue sharing between many parties**.

The canonical example is a **lending protocol**. The loan terms, the collateral and the liquidation point live in an on-chain program and execute identically for everyone. The lender relies on a rule neither side can circumvent, not on the borrower's honesty.

**The pattern they want:** take a financial relationship that today needs a trusted intermediary and redesign it so the intermediary is no longer needed. Example areas: escrow, freelancer↔client settlement, fundraisers with conditional refunds, revenue sharing, parametric insurance, loyalty programs, B2B settlements.

## 2. Challenge

**Design and build a solution on Solana that removes the need for trust from a financial transaction.**

Start by asking where in your work, business or daily life you have to trust someone for a transaction to happen. It might be the counterparty, an intermediary, or both. Who profits from that trust, what does it cost, and what happens when it is misplaced?

Then redesign the relationship:
- The terms are written into an on-chain program.
- They execute automatically and identically for every participant.
- Neither party can change them unilaterally.
- Party A doesn't need to trust party B, and nobody is needed to enforce the rule.

The challenge is open in domain and form: solve a specific market problem or build a general-purpose tool. **The quality of the reasoning matters as much as the code.**

## 3. Expected outcome

A **working application**, not a concept or mockup. It must be launchable and clickable, though it doesn't need to be production-ready.

The app counts as complete when it:
- implements **at least one full use case, from user input to a completed transaction**;
- can **demonstrate the moment the intermediary is no longer needed** (the heart of the project);
- **works live during the presentation**, not just in a recording.

"The interface can be rough." They prefer a simple app where everything works over a polished design with nothing underneath.

**Name your target user explicitly**, e.g. "freelancers invoicing foreign clients", "fundraiser organizers", or "developers building on Solana". This choice drives the interface language and how much of the crypto layer you hide. Either kind of audience is fine if the choice is deliberate.

Also provide a **short design rationale** covering:
- which financial relationship was redesigned
- who the intermediary was
- what specifically changes once the intermediary is removed

## 4. Submission requirements

**Required:**
- project title and a detailed description **including the design rationale**
- PDF presentation of **10 slides or fewer**
- **video, 3 minutes or shorter**, at a public link
- **code repository**

**Optional:** screenshots, demo links, graphics.

## 5. Technical requirements

- **Must run on Solana. Devnet is sufficient.** No mainnet and no real funds. Get test SOL from a faucet.
- **The logic that replaces the intermediary MUST live in the on-chain program.** "If your backend enforces the transaction terms, the intermediary has not disappeared; it has simply become you."
- **Environment:** installing Rust, the Solana CLI and Anchor can take hours. Two ways to skip that:
  - Use the dev container from their materials (VS Code or GitHub Codespaces).
  - Use **Solana Playground** to compile and deploy from the browser.
- **The rest of the stack is up to you:**
  - **On-chain:** Anchor (the easiest), native Rust, Pinocchio, Steel, etc.
  - **Frontend:** any framework. Use `@solana/kit` or `@solana/web3.js` for the network and **Wallet Adapter** for wallets.
  - **Building blocks:** SPL Token, Token-2022, price oracles (**Pyth, Switchboard**), existing protocols and their SDKs.

## 6. Testing / demo

Evaluation happens at a **live presentation**. Demo flow: the user arrives, connects a wallet, performs an operation and sees the result. **Show a confirmed transaction in Solana Explorer or Solscan.**

**Preparation:**
- Fund the wallets with test SOL in advance and put accounts in the right state.
- If the flow has two parties, prepare **two wallets**.
- Have a **backup recording** in case the faucet or internet fails.

**Questions they will ask:**
- Where exactly in the code does the intermediary disappear? Which part of the program enforces terms that neither party can circumvent?
- What happens if one party disappears halfway? Where are the funds, and who can recover them?
- Who has permission to do what? Can you, as the author, change anything after deployment (upgrade authority, admin keys)?
- **Why blockchain and not a regular database?** This question will definitely come up.
- What would you do with another week?

**Not evaluated:** attack resistance, audits, design quality, test coverage. If something breaks, say plainly what went wrong. **Awareness of your limitations is valued above pretending they don't exist.**

**Code:** the judges look at the repo before and after the pitch. They check that the on-chain program does what the demo shows. Include a **clear README** describing what is where.

## 7. Resources

- Superteam Poland bootcamp "From Zero to Blockchain Developer":
  - theory: https://matzayonc.github.io/stpl-bootcamp
  - examples and dev container: https://github.com/matzayonc/solana-live-course-2026
- Solana docs (also in Polish): https://solana.com/pl/docs. Includes a browser quickstart and `npx create-solana-dapp`.
- Anchor: https://anchor-lang.com/docs, https://book.anchor-lang.com
- Available on site: Solana Playground, a devnet faucet, Solana Explorer, and mentors at the booth throughout the event.

## 8. Evaluation criteria

- Relevance to the challenge — **30%**
- Completeness and functionality — **25%**
- Idea and choice of problem — **20%**
- Implementation potential — **15%**
- Originality — **10%**

## 9. After the hackathon

- Superteam invites the strongest projects to keep developing in the community.
- They offer help with refining the idea, finding co-founders and users, and preparing Solana ecosystem grant applications. Funding is not guaranteed.
- They also offer jobs and paid bounties.
- **The code remains yours.** The repo only has to be public during evaluation.

## 10. Contact

- Superteam Poland booth (fastest)
- Telegram: @matzayonc, @matjanisz
- Email: pl@superteam.fun
- Links: linktr.ee/superteampoland

## Rules summary

- Team of 1–6. Required: title, team name, members, description, and a PDF of 10 slides or fewer. English or Polish.
- Judging has two phases: a mentor commission, then a live pitch for finalists. You need ≥50% in phase 1 to win a prize.
- Copyright is not transferred.
