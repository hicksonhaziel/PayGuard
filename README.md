# QVAC PayGuard

QVAC PayGuard is a local-first desktop payment safety layer for Solana stablecoin users. It uses on-device QVAC OCR, local trusted-recipient RAG, and local LLM reasoning to review payment context before a wallet signature, then routes the payment to direct send, guarded escrow, or block.

The core idea is simple: wallets sign transactions, but PayGuard checks the payment intent first.

## Presentation

[View the QVAC PayGuard presentation deck](https://qvac-payguard-9ekt8fa.gamma.site/)

## What PayGuard Does

- Reads invoices and screenshots locally with QVAC OCR.
- Compares the entered payment against saved trusted recipients and payment history.
- Uses local LLM reasoning to produce a `Safe`, `Review`, or `Block` verdict.
- Sends real Solana SPL stablecoin transfers through Phantom or Solflare.
- Supports guarded payments on devnet USDC with sender cancel and receiver claim.
- Keeps recipient records, payment history, and receipts in a local SQLite database.

## Project Structure

```text
apps/desktop
  Electron + React desktop app, wallet bridge, local storage, Solana signing flow

apps/qvac-agent
  QVAC OCR, RAG, and LLM risk analysis module

programs/payguard_escrow
  Native Solana escrow program for guarded payments

apps/web
  Web/landing scaffold, not required for the desktop demo
```

## Requirements

- Node.js 22 or newer
- npm
- Phantom or Solflare browser wallet
- Solana CLI for optional devnet setup and program work
- A devnet wallet with SOL for fees
- Devnet USDC for testing payments

QVAC models are downloaded and cached by the QVAC SDK on first use. The first OCR/RAG/LLM run can take longer than later runs.

## Install

```bash
npm install
```

## Run The Desktop App

From the repository root:

```bash
npm run dev:desktop
```

This builds `apps/qvac-agent`, starts the Electron renderer on `127.0.0.1:5174`, compiles Electron, and opens the desktop app.

## Build

```bash
npm run build
```

This builds both:

- `apps/qvac-agent`
- `apps/desktop`

## Devnet Wallet And Token Setup

PayGuard signs through the user's browser wallet. For devnet testing:

1. Create or select a devnet wallet in Phantom or Solflare.
2. Airdrop devnet SOL for transaction fees.
3. Fund the wallet with devnet USDC.
4. Connect that wallet inside PayGuard.

### Devnet SOL

Using Solana CLI:

```bash
solana config set --url devnet
solana airdrop 2 <YOUR_WALLET_ADDRESS>
```

### Devnet USDC

The app defaults to this devnet USDC mint:

```text
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

Use a devnet USDC faucet or a test mint flow that funds this mint. The sender wallet must hold devnet USDC before direct send or guarded payment funding will work.

Devnet USDT is intentionally disabled in the UI because there is no reliable default devnet USDT mint configured for this MVP.

## Solana Networks And Mints

Default mints:

```text
Devnet USDC:
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

Mainnet USDC:
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

Mainnet USDT:
Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```

Direct send supports mainnet USDC and USDT in code, but the demo focus is devnet.

Guarded payments are currently enabled for devnet USDC only.

## Environment Variables

Optional runtime configuration:

```bash
PAYGUARD_SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
PAYGUARD_SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
PAYGUARD_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PAYGUARD_DEVNET_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
PAYGUARD_DEVNET_USDT_MINT=
PAYGUARD_ESCROW_PROGRAM_ID=CzQ6EYC8PBwLC5QsrAcrjeEQKJzbcLWZfTta7Qi8MZKZ
PAYGUARD_BALANCE_CACHE_SECONDS=60
PAYGUARD_WALLET_BRIDGE_PORT=49152
```

The local wallet bridge uses `127.0.0.1:49152` by default. If that port is busy, PayGuard falls back to an available local port.

## QVAC Local Processing

QVAC is the core risk engine in PayGuard.

### OCR

When a user uploads an invoice or screenshot, QVAC OCR runs locally on the user's machine. PayGuard extracts text and hints such as:

- visible amounts
- wallet-like addresses
- invoice/reference numbers
- merchant or recipient names
- scam-like language

The uploaded document does not define the transaction by itself. The user's manual fields define the payment intent. OCR is used to verify or challenge those fields.

### Trusted Recipient RAG

PayGuard stores trusted recipients and local payment history in SQLite. During analysis, QVAC RAG compares the current payment against those records.

This helps detect:

- exact trusted wallet matches
- wallet mismatch for a familiar recipient
- first-time recipients
- amount deviation from local history
- weak or missing recipient context

### LLM Risk Reasoning

The local QVAC LLM receives:

- manual payment fields
- OCR text
- deterministic OCR consistency checks
- RAG match result

It returns:

- risk score
- verdict: `Safe`, `Review`, or `Block`
- recommended route: `Direct Send`, `Guarded Payment`, or `Block`
- human-readable reasons

PayGuard also applies deterministic safety rules around the model result. For example, document wallet mismatch, amount mismatch, incomplete invoice evidence, or scam-like language can force a safer route.

## Payment Flow

1. User connects Phantom or Solflare.
2. User enters recipient wallet, amount, token, and optional memo.
3. User optionally uploads an invoice or screenshot.
4. QVAC runs local analysis on the secure processing screen.
5. PayGuard shows a verdict and recommended route.
6. User chooses Direct Send, Guarded Payment, or cancels.
7. Browser wallet signs the Solana transaction.
8. PayGuard stores a local receipt and history record.

Manual fields are always the transaction intent. OCR is verification evidence.

## Guarded Payments

Guarded payments are a recovery-window escrow flow for risky or first-time payments.

The sender funds a PayGuard escrow PDA with devnet USDC. The receiver can claim after the unlock time. The sender can cancel before unlock.

Current devnet program:

```text
CzQ6EYC8PBwLC5QsrAcrjeEQKJzbcLWZfTta7Qi8MZKZ
```

Guarded payment states:

- `funded`: funds are held in escrow
- `cancelled`: sender cancelled before unlock
- `claimed`: receiver claimed after unlock

The app automatically discovers guarded payments for the connected wallet by scanning the PayGuard escrow program. The `Guarded` page and notification icon show:

- sender cancellable holds
- receiver pending holds
- receiver ready-to-claim holds

## Local Data

PayGuard stores local app data in Electron's user data directory:

```text
payguard.sqlite
```

Stored data includes:

- trusted recipients
- local payment history
- receipt details
- on-chain import metadata

Private keys are never stored by PayGuard. Signing happens in Phantom or Solflare.

## Demo Scenarios

### Safe Direct Send

1. Add a trusted recipient.
2. Enter the trusted wallet and normal amount.
3. Upload a matching invoice if available.
4. Expected result: `Safe`, `Direct Send`.

### Invoice Mismatch

1. Enter a saved/trusted wallet manually.
2. Upload an invoice showing a different wallet or amount.
3. Expected result: `Review`, `Guarded Payment`.

### First-Time Recipient

1. Enter a new wallet with no document.
2. Expected result: `Review`, `Guarded Payment`.

### Scam Screenshot

1. Upload a screenshot containing suspicious language such as `urgent`, `seed phrase`, `wallet verification`, or `final warning`.
2. Expected result: `Block`.

### Guarded Claim

1. Sender creates a guarded devnet USDC payment.
2. Receiver connects their wallet.
3. Receiver waits for unlock.
4. Receiver claims from the `Guarded` page.

## Known MVP Limits

- Guarded payments are devnet USDC only.
- Mainnet guarded escrow is not deployed or enabled.
- Direct send has mainnet USDC/USDT mint support, but mainnet use should be treated carefully.
- Public devnet RPC can be flaky. Guarded discovery may occasionally fail with network fetch errors.
- OCR can misread low-quality images, stylized text, or currency symbols. PayGuard treats OCR as verification evidence, not the payment source of truth.
- Uploaded documents must be local files. PNG/JPG images are the primary OCR target for the MVP.
- The browser signing bridge depends on Phantom/Solflare behavior. Some OS/browser combinations may block automatic focus return or tab close.
- Local RAG quality depends on the user's saved recipients and payment history.
- Escrow accounts are not rent-closed after claim/cancel in the MVP.

## Troubleshooting

### `wallet:list-guarded-payments: TypeError: fetch failed`

The app could not reach the Solana RPC while scanning guarded escrows. This is usually devnet RPC flakiness or rate limiting. Refresh the Guarded page or use a custom RPC:

```bash
PAYGUARD_SOLANA_DEVNET_RPC_URL=<YOUR_DEVNET_RPC> npm run dev:desktop
```

### Wallet opens but asks to connect repeatedly

PayGuard uses a local browser bridge for signing. It prefers a stable origin at `127.0.0.1:49152`, but wallet trust behavior can vary by browser and extension.

### QVAC first run is slow

The SDK may download and cache OCR, embedding, and LLM models on first use. Later runs should be faster.

## Repository Status

This project is optimized for the Tether/QVAC sidetrack: a polished local-first Electron demo showing QVAC as a meaningful pre-sign payment intelligence layer, with real Solana devnet payment execution.
