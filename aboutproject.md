# QVAC PayGuard

## One-line pitch

**QVAC PayGuard is a non-custodial Solana payment safety layer that uses local QVAC AI to read invoices and screenshots on-device, accept voice commands, analyze risk with local RAG, explain verdicts verbally, and route risky stablecoin transfers into guarded payments instead of blind direct sends.**

---

## Goal

This project is being optimized for the **Tether/QVAC sidetrack**.

The goal is to win by proving one thing clearly:

**QVAC is essential to the product, not a decorative add-on.**

The product must show a real stablecoin payment flow where:

* private payment context stays local
* QVAC performs meaningful product work (OCR, STT, embeddings/RAG, LLM reasoning, TTS) before signature
* Solana executes the actual payment or guarded-payment fallback

---

## Submission reality

The Tether sidetrack does **not** require a web app.

Requirements:
* Valid Frontier submission before **May 11** deadline
* Meaningful **QVAC SDK** integration in the core product
* Local/offline execution on the user’s device
* Public GitHub repository
* Working demo or clear video walkthrough

**App format**: Electron desktop app (best for local-first privacy story, GPU usage, file ingestion, and demo clarity).

---

## MVP scope

### Core build

* Ship as an **Electron desktop app**
* Support reliable non-custodial Solana signing (Phantom/Solflare)
* Accept payment via voice or manual entry + document upload
* Run local QVAC OCR on invoices/screenshots
* Run local QVAC risk analysis with lightweight RAG
* Show verdict: `Safe`, `Review`, or `Block`
* Let user choose `Direct Send` or `Guarded Payment`
* Complete real Solana devnet stablecoin flow
* Generate local receipt with option to listen to summary
* Include **History** and **Trusted Recipients** management pages

### QVAC Capabilities Used

* **OCR** — extract text from invoices and screenshots
* **Speech-to-Text** — voice payment input
* **Embeddings + RAG** — compare against local trusted recipient history
* **LLM Inference** — risk reasoning and natural explanations
* **Text-to-Speech** — read verdicts and summaries aloud

All processing is fully local.

---

## What not to build in the MVP

Do not spend time on:
* Mobile app
* Browser extension
* Translation
* Full wallet replacement
* Advanced multi-step agent workflows
* Complex dispute resolution

---

## Product thesis

Most wallet security tools analyze the transaction after it’s crafted.  
PayGuard analyzes the **payment context before signature** using local AI.

It answers the critical questions:
* Who am I really paying?
* Does this match the invoice/screenshot?
* Is this a trusted or suspicious recipient?
* Should this be direct or guarded?

---

## Why QVAC matters

Private data (invoices, chat screenshots, recipient history, voice input) stays on-device. Cloud AI would destroy the privacy value proposition. QVAC enables the entire intelligent pre-sign layer locally.

---

## App Screens

1. **Home / Dashboard**
2. **New Payment** (voice + manual + upload)
3. **Processing**
4. **Verdict**
5. **Payment Confirmation**
6. **Receipt / Success**
7. **History** — list of all transactions (filterable by Direct/Guarded/Blocked)
8. **Trusted Recipients** — manage known suppliers with payment stats and quick “New Payment” action

---

## MVP user flow

1. Connect wallet (non-custodial)
2. Create payment request (voice command or manual + upload document)
3. Run local QVAC analysis (OCR → RAG → LLM reasoning)
4. View verdict + hear spoken explanation (TTS)
5. Choose payment mode (Direct Send or Guarded Payment)
6. Sign transaction on Solana devnet
7. Receive local receipt (with listen option)

---

## Recommended demo flows

**Demo 1: Safe Payment**  
Voice or upload clean invoice → OCR + RAG match → Safe verdict → Direct Send

**Demo 2: Scam Attempt**  
Upload suspicious screenshot → OCR detects urgency + new wallet → Block verdict

**Demo 3: First-time Recipient**  
New recipient via voice → Review verdict → Choose Guarded Payment → Escrow on devnet

**Demo 4 (Bonus)**: Browse History and Trusted Recipients to show persistence.

---

## Judging strategy

Judges should clearly see:
* **Strong QVAC integration** — 5 capabilities working together meaningfully
* **Real utility** for stablecoin users (freelancers/merchants)
* **On-chain impact** — AI decision changes payment path
* **Privacy & local-first** — everything processed on-device
* **Polished UX** with voice input and spoken output

---

## Technical architecture

### apps/desktop
* Electron shell + all UI screens
* Voice handling, file upload, receipt storage
* Navigation between Dashboard, New Payment, History, Recipients

### apps/qvac-agent
* QVAC OCR wrapper
* Speech-to-Text
* Embeddings + lightweight RAG
* LLM risk analysis
* Text-to-Speech
* Result formatting

### programs/payguard_escrow
* Create guarded payment
* Cancel before unlock
* Claim after unlock

### packages/shared
* Types, verdict enums, models, etc.

---

## Submission positioning

**PayGuard is a local-first desktop payment safety layer for Solana stablecoin users.**  
It lets you speak a payment, reads invoices/screenshots on-device with QVAC, analyzes risk using local RAG, explains decisions verbally, and intelligently routes payments (direct or guarded) — all while keeping sensitive data private.

This is the strongest version for the sidetrack.

---

## Final build decision

A polished Electron desktop app with full local QVAC intelligence (OCR + Voice + RAG + LLM + TTS), Solana devnet integration, guarded escrow, History & Recipients pages, backed by a clean repo, setup instructions, and a strong demo video.