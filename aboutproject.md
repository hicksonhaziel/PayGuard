# QVAC PayGuard

## One-line pitch

**QVAC PayGuard is a non-custodial Solana payment safety layer that uses local QVAC AI to read invoices and screenshots on-device, score payment risk before signature, and route risky stablecoin transfers into guarded payment instead of blind direct send.**

---

## Goal

This project is being optimized for the **Tether/QVAC sidetrack**, not for the broader Frontier hackathon.

The goal is to win by proving one thing clearly:

**QVAC is essential to the product, not a decorative add-on.**

The product must show a real stablecoin payment flow where:

* private payment context stays local
* QVAC performs meaningful product work before signature
* Solana executes the actual payment or guarded-payment fallback

---

## Submission reality

The Tether sidetrack does **not** require a web app.

What it requires is:

* a valid Frontier submission before the **May 11** deadline
* a meaningful **QVAC SDK** integration in the core product
* local or offline execution on the user's device
* a public GitHub repository
* a working demo or a clear video walkthrough

That means the format should be chosen for the strongest product and demo story.

For this project, the best format is:

* **Electron desktop app**

Why:

* it fits the local-first privacy story better than a browser-first build
* it is a more natural place to run QVAC locally on desktop GPUs
* it makes invoice and screenshot ingestion simpler
* it makes the "data never leaves the device" argument clearer to judges

---

## MVP scope

The MVP is intentionally narrow.

### Core build

* Ship as an **Electron desktop app**
* Support one reliable non-custodial Solana signing flow for the demo
* Enter a payment manually or upload an invoice / screenshot
* Run local QVAC OCR
* Run local QVAC risk analysis
* Show a simple verdict: `Safe`, `Review`, or `Block`
* Let the user choose `Direct Send` or `Guarded Payment`
* Complete a real Solana devnet stablecoin flow
* Generate a local receipt

### One extra feature worth adding

To improve odds of placing 1st or 2nd without bloating scope, add:

* **Trusted recipient matching**

This means the app can compare a new payment request against a small local list of known recipients and flag:

* first-time recipient
* new wallet for an existing supplier
* name / address mismatch

This feature makes the risk engine feel much more real and gives judges a stronger scam-prevention story.

---

## What not to build in the MVP

Do not spend hackathon time on:

* voice payments
* TTS
* translation
* mobile app
* browser extension
* browser-only wallet assumptions
* full wallet replacement
* advanced disputes
* broad multi-step RAG memory systems

If time remains, improve demo quality and reliability instead of adding surface area.

---

## Product thesis

Most wallet security systems focus on the transaction itself.

PayGuard focuses on the **payment context before signature**.

That is the wedge.

Existing wallets can help answer:

* what will this transaction do?

PayGuard tries to answer:

* who am I really paying?
* does this match the invoice or screenshot?
* is this a new or mismatched recipient?
* should this be sent directly or guarded first?

---

## Why QVAC matters

This product works best only if the AI runs locally.

Private data may include:

* invoices
* screenshots from WhatsApp or Telegram
* wallet addresses
* payment amounts
* merchant names
* payment reasons
* local trusted-recipient data

Uploading that data to a cloud AI service weakens the privacy story and makes the sidetrack pitch worse.

QVAC gives the project a strong reason to exist:

* local OCR for invoice and screenshot extraction
* local LLM or local classification for risk explanation
* local embeddings or deterministic matching for trusted-recipient checks if needed

The message to judges should be simple:

**The payment is analyzed where the user is, not on someone else’s server.**

---

## App format

PayGuard should be built as a **local-first Electron desktop application**.

That app should combine:

* a desktop UI for payment entry, document upload, verdict display, and receipts
* local QVAC inference for OCR and risk analysis
* Solana devnet payment execution
* local receipt storage

Important constraint:

* do not design the MVP around browser-extension UX that only works well in Chrome

The product should be demoable from one machine, in one flow, without depending on cloud AI services.

---

## Target user

The MVP should focus on one primary user:

* **small merchant or freelancer paying suppliers / vendors in stablecoins**

That use case is easier to demo than a broad “every wallet user” pitch.

It also makes screenshot + invoice analysis feel immediately useful.

---

## MVP user flow

### 1. Connect wallet

User opens the Electron app and connects or uses the project's chosen non-custodial signing flow.

For the MVP, reliability matters more than optional wallet variety.

PayGuard never holds keys.

### 2. Create a payment request

The user can:

* enter recipient, token, amount, and reason manually
* upload an invoice, WhatsApp screenshot, Telegram screenshot, or receipt image

### 3. Run local QVAC analysis

PayGuard runs:

* QVAC OCR to extract text and payment details
* local risk analysis against payment context
* trusted-recipient matching against locally stored known recipients

### 4. Show verdict

The app returns one simple verdict:

* `Safe`
* `Review`
* `Block`

It must also show short reasons, for example:

* known recipient
* new wallet address
* amount higher than normal
* urgency language detected
* invoice name does not match saved supplier

### 5. Choose payment mode

If verdict is low-risk:

* `Direct Send`

If verdict is medium-risk:

* `Guarded Payment`

If verdict is clearly dangerous:

* `Block`

### 6. Complete Solana devnet payment

The user signs in Phantom or Solflare.

For direct send:

* normal SPL stablecoin transfer

For guarded payment:

* transfer into the PayGuard escrow program with unlock time and recipient set

### 7. Generate local receipt

After completion, PayGuard stores a local receipt containing:

* verdict
* reason summary
* recipient
* amount
* transfer mode
* transaction signature
* document hash if applicable

---

## Recommended demo flows

Only build around three demo flows.

### Demo 1: Safe payment

* Upload a clean supplier invoice
* OCR extracts amount and wallet
* Trusted-recipient match succeeds
* Verdict is `Safe`
* User sends directly

### Demo 2: Scam screenshot

* Upload a screenshot saying to pay a new wallet urgently
* OCR extracts text
* Risk engine detects urgency + new wallet + mismatch
* Verdict is `Block`
* No funds are sent

### Demo 3: First-time recipient

* User enters a manual payment to a new recipient
* Verdict is `Review`
* User chooses `Guarded Payment`
* Funds move into escrow on Solana devnet

These three flows are enough for the sidetrack.

---

## Judging strategy

The judges should leave the demo with these impressions:

### 1. Clear QVAC usage

QVAC is doing real work:

* reading documents locally
* interpreting risk locally
* preserving privacy

### 2. Real product utility

The app solves a believable stablecoin problem:

* invoice fraud
* wrong-recipient sends
* supplier impersonation
* risky first-time transfers

### 3. Real onchain consequence

The output of the AI review changes how the money moves:

* direct send
* guarded payment
* block

That connection between local AI context and onchain payment behavior is the strongest part of the submission.

### 4. Reproducible submission

The submission should be easy to evaluate:

* public repo
* clear setup instructions
* one-command or low-friction local run
* short demo video in case judges do not reproduce the full stack live

Demo quality only counts for 10%, but poor setup can still weaken confidence in the project.

---

## Technical architecture

### apps/desktop

Responsibilities:

* Electron shell and desktop UI
* payment entry and document upload flow
* verdict, review, and receipt screens
* local file access and receipt persistence
* Solana payment client flow

### apps/qvac-agent

Responsibilities:

* QVAC OCR wrapper
* payment detail extraction
* risk scoring
* trusted-recipient matching
* result formatting for the desktop app



### programs/payguard_escrow

Responsibilities:

* create guarded payment
* cancel guarded payment before unlock
* claim guarded payment after unlock

### packages/shared

Responsibilities:

* shared types
* verdict enums
* payment intent models
* receipt models

---

## Suggested verdict model

Use a compact, easy-to-demo model.

### Safe

Use when:

* known recipient
* matching invoice or expected context
* no obvious scam pattern

### Review

Use when:

* first-time recipient
* amount is unusual
* address changed for a known supplier

### Block

Use when:

* strong urgency language
* clear mismatch between claimed recipient and wallet
* obviously suspicious payment context

This does not need to be academically perfect.

It needs to be understandable and convincing in a live demo.

---

## Submission positioning

The best framing is:

**PayGuard is a local-first desktop payment safety layer for stablecoin users on Solana. It reads invoices and chat screenshots on-device with QVAC inside an Electron app, explains risk before signature, and routes risky payments into guarded settlement instead of blind transfer.**

Avoid framing it as:

* “AI wallet”
* “general crypto security tool”
* “all-in-one payments platform”

Keep it tightly about:

* stablecoin payments
* local privacy
* pre-sign risk review
* guarded fallback on Solana

---

## Final build decision

For the sidetrack, the strongest version is:

**A working Electron desktop app + local QVAC OCR/risk engine + Solana devnet stablecoin payment flow + guarded-payment program + three polished demo scenarios, backed by a public repo and a concise demo video.**
