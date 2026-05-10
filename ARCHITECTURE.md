# QVAC PayGuard Architecture

QVAC PayGuard is a local-first Electron desktop app that checks payment context before a Solana wallet signs. The app combines local QVAC OCR/RAG/LLM/TTS analysis with real Solana stablecoin transactions and a devnet guarded-payment escrow program.

## High-Level Flow

```text
User payment intent
  -> manual fields + optional invoice/screenshot
  -> local QVAC OCR/RAG/LLM analysis
  -> QVAC TTS spoken verdict
  -> verdict and route recommendation
  -> browser wallet signing
  -> Solana direct transfer or guarded escrow
  -> local receipt and history
```

The manual payment form is the source of truth for the transaction. Uploaded documents are used as evidence to verify or challenge what the user typed.

## Main Components

### `apps/desktop`

The Electron desktop app.

Responsibilities:

- React UI screens
- wallet connection and signing bridge
- local SQLite storage
- Solana transaction building
- guarded payment discovery
- receipt and history UI
- IPC bridge between renderer and Electron main process

Important areas:

```text
apps/desktop/src
  React pages and UI components

apps/desktop/electron/main.ts
  Electron IPC handlers, Solana transaction builders, wallet bridge

apps/desktop/electron/preload.ts
  Safe API exposed to the renderer through contextBridge

apps/desktop/electron/local-store.ts
  Local SQLite recipients, history, receipts, and imports
```

### `apps/qvac-agent`

The local AI/risk module.

Responsibilities:

- QVAC OCR for uploaded invoices/screenshots
- local embedding/RAG search over trusted recipients
- local LLM risk reasoning
- QVAC TTS spoken verdict generation
- deterministic safety normalization around LLM output

Important files:

```text
ocr.ts
  Reads invoice/screenshot text locally with QVAC OCR.

rag.ts
  Embeds trusted recipient records and searches for local matches.

llm.ts
  Produces risk verdicts and applies safety guardrails.

tts.ts
  Synthesizes a short spoken verdict from the normalized route decision.
```

### `programs/payguard_escrow`

Native Solana escrow program for guarded payments.

Current devnet program id:

```text
CzQ6EYC8PBwLC5QsrAcrjeEQKJzbcLWZfTta7Qi8MZKZ
```

Instructions:

- create guarded payment
- cancel before unlock
- claim after unlock

## Wallet Connection

PayGuard is non-custodial. It never stores private keys.

The app supports Phantom and Solflare through a browser signing bridge.

### Why a browser bridge exists

Electron itself does not reliably have access to browser wallet extensions. PayGuard opens a local browser page at:

```text
http://127.0.0.1:49152
```

That page talks to Phantom/Solflare, then sends only the public result back to the desktop app through the local bridge.

If port `49152` is busy, PayGuard falls back to another local port.

### Wallet connect flow

```text
User clicks Connect Wallet
  -> Electron starts local bridge
  -> browser opens local connect page
  -> user approves Phantom/Solflare
  -> browser sends wallet address + provider to Electron
  -> Electron sends wallet info to React app
  -> React stores connected wallet in localStorage
```

Stored wallet data:

- public address
- wallet label
- provider name
- connected timestamp

Private keys and seed phrases never touch PayGuard.

## Payment Analysis Flow

The New Payment page collects:

- recipient wallet
- amount
- token
- optional memo
- optional invoice/screenshot

The user must enter the wallet and amount. OCR does not silently fill the transaction.

### Analysis pipeline

```text
Manual payment fields
  + optional document path
  + local trusted recipients
  -> QVAC OCR, if document exists
  -> OCR consistency checks
  -> QVAC RAG trusted-recipient matching
  -> QVAC LLM risk verdict
  -> deterministic route normalization
  -> QVAC TTS spoken verdict
  -> Verdict screen
```

### OCR role

QVAC OCR extracts text and hints from the uploaded file:

- visible amounts
- wallet-like addresses
- invoice/reference numbers
- merchant names
- suspicious language

OCR is verification evidence. It checks whether the invoice agrees with the manually entered payment.

Examples:

- manual wallet matches invoice wallet: lowers risk
- invoice wallet differs from manual wallet: review/guarded
- invoice amount differs from manual amount: review/guarded
- invoice missing wallet or amount: review
- scam-like text: block

### RAG role

Trusted recipients and local payment history are converted into compact local documents. QVAC embeddings search those records against the current payment.

RAG helps answer:

- Is this an exact trusted wallet?
- Is this a similar recipient but different wallet?
- Is this a first-time recipient?
- Does the amount look unusual compared to history?

Exact wallet matches outrank semantic similarity because payment safety depends on public keys, not names.

### LLM role

The local QVAC LLM receives:

- manual payment fields
- OCR text
- OCR consistency findings
- RAG result

It returns:

- verdict: `Safe`, `Review`, or `Block`
- risk score
- recommended route
- reasons
- summary

PayGuard then normalizes the model output with deterministic safety rules. This keeps critical cases predictable even if model wording varies.

### TTS role

After normalization, QVAC TTS turns the final decision into a short spoken line:

```text
Verdict: Safe. Recommended route: Direct Send.
```

The spoken verdict is a local demo-facing confirmation step. If TTS synthesis fails or the model has not been cached yet, the renderer falls back to the browser speech engine and the payment flow continues.

## Verdict And Routing

PayGuard supports three routes:

### Direct Send

Used for low-risk payments.

The app builds a standard SPL token transfer transaction:

```text
sender ATA -> recipient ATA
```

The browser wallet signs and submits the transaction.

### Guarded Payment

Used for first-time, incomplete, or risky-but-not-blocked payments.

The sender funds a Solana escrow PDA. The recipient can claim after the unlock time. The sender can cancel before unlock.

### Block

Used when the payment context is too suspicious.

The app does not build a transaction by default, but the UI can still allow a stubborn user to choose direct payment after seeing the warning.

## Signing Flow

For direct and guarded actions:

```text
User chooses payment action
  -> Electron builds unsigned Solana transaction
  -> Electron opens local browser signing page
  -> page selects the already-connected wallet provider
  -> Phantom/Solflare signs and sends
  -> browser posts signature back to Electron
  -> Electron closes bridge and focuses app
  -> React shows success and stores receipt
```

The signing page shows only the wallet provider already connected in PayGuard when known.

## Guarded Payments

Guarded payments are designed for payments where the sender wants a recovery window.

### Create guarded payment

```text
sender signs guarded funding transaction
  -> creates escrow PDA state
  -> creates vault token account
  -> transfers USDC into vault
  -> stores unlock time
```

### Cancel

Before unlock:

```text
sender signs cancel transaction
  -> program transfers vault funds back to sender
  -> escrow status becomes cancelled
```

### Claim

After unlock:

```text
recipient signs claim transaction
  -> program transfers vault funds to recipient
  -> escrow status becomes claimed
```

The receiver needs a little devnet SOL for transaction fees and possible associated token account rent.

## Guarded Discovery

The app scans PayGuard escrow program accounts on devnet and filters records where the connected wallet is either:

- sender
- recipient

This powers:

- `Guarded` page
- notification badge/dropdown
- claim/cancel availability

Current behavior:

- sender sees cancellable funded holds before unlock
- receiver sees pending holds before unlock
- receiver sees claimable holds after unlock

## Local Storage

PayGuard stores data locally in Electron's user data directory:

```text
payguard.sqlite
```

Stored data includes:

- trusted recipients
- payment history
- local receipts
- on-chain import metadata

This database stays on the user's machine.

## Network And Token Support

### Devnet

Direct send:

- USDC supported
- USDT enabled only when a demo mint is configured with `PAYGUARD_DEVNET_USDT_MINT`
- the devnet USDT mint is treated as a demo/test mint, not official Tether devnet USDT

Guarded payments:

- devnet only
- USDC and any configured demo USDT mint

### Mainnet

Direct send has mainnet mint support for:

- USDC
- USDT

Guarded payments are not enabled on mainnet because the escrow program has not been deployed/configured for mainnet.

## Security Model

PayGuard protects the user before signature by combining:

- manual payment intent
- document OCR verification
- trusted-recipient matching
- local LLM reasoning
- deterministic safety rules
- non-custodial wallet signing

PayGuard does not:

- store private keys
- sign transactions itself
- upload invoices to a cloud AI service
- control funds after direct send

## Current MVP Limits

- Guarded escrow is devnet only, using USDC or configured demo USDT.
- Mainnet guarded payments are not enabled.
- Public devnet RPC can be unreliable.
- OCR can misread low-quality images.
- Local RAG quality depends on saved recipient/history data.
- Escrow accounts are not rent-closed after claim/cancel.
- Browser tab close/focus behavior varies by OS and browser.
