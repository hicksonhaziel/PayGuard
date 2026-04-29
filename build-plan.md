# QVAC PayGuard Technical Build Plan

## Build intent

This plan is technical on purpose.
It is meant to answer:

* what gets built each day
* which modules are touched
* what should be testable by the end of the day
* which features are core vs optional

The plan is still scope-aware.
We are not trying to finish every possible feature before the core payment flow works.

---

## Product scope

### Core scope

These are the features the project should absolutely ship with:

* Phantom / Solflare wallet connection
* manual payment intent entry
* invoice / screenshot upload
* local QVAC OCR
* local QVAC risk analysis
* verdict output: `Safe`, `Review`, `Block`
* Solana devnet direct send
* Solana guarded payment flow
* local receipt generation

### Stretch features

These are valid features, but should only land after the core path is stable:

* trusted recipient memory
* QR scan for payment requests
* voice payment input
* text-to-speech warning
* local-language translation

### Technical rule

No stretch feature should block:

* wallet connection
* OCR to review flow
* verdict generation
* at least one real devnet payment path

---

## Proposed repo structure

```txt
apps/
  web/
    app/
    components/
    lib/
    public/demo-documents/
  qvac-agent/
    src/
packages/
  shared/
    src/
programs/
  payguard_escrow/
    src/
tests/
```

### Responsibility split

`apps/web`

* UI
* wallet connection
* file upload
* review screen
* direct send client flow
* guarded payment client flow
* receipt display

`apps/qvac-agent`

* QVAC OCR wrapper
* OCR normalization
* risk engine
* optional trusted recipient matching
* optional voice / translation adapters later

`packages/shared`

* shared TypeScript types
* enums
* payload contracts
* validation helpers if needed

`programs/payguard_escrow`

* Anchor guarded-payment program
* create / cancel / claim instructions
* onchain state definition

`tests`

* Anchor integration tests
* fixture-driven scenario tests for review logic if needed

---

## Required data models

These should exist early because the whole app depends on them.

### `PaymentIntent`

Fields:

* `recipientName?: string`
* `recipientAddress?: string`
* `tokenSymbol: string`
* `amount: string`
* `reason?: string`
* `sourceType: "manual" | "document" | "voice" | "qr"`
* `sourceLabel?: string`
* `rawText?: string`

### `OcrExtraction`

Fields:

* `merchantName?: string`
* `walletAddress?: string`
* `amount?: string`
* `tokenSymbol?: string`
* `invoiceNumber?: string`
* `dueDate?: string`
* `paymentReason?: string`
* `rawText: string`

### `RiskVerdict`

Fields:

* `verdict: "Safe" | "Review" | "Block"`
* `score?: number`
* `reasons: string[]`
* `signals: string[]`

### `Receipt`

Fields:

* `id: string`
* `mode: "direct" | "guarded"`
* `recipientAddress: string`
* `tokenSymbol: string`
* `amount: string`
* `verdict: "Safe" | "Review" | "Block"`
* `txSignature?: string`
* `guardedPaymentAddress?: string`
* `documentHash?: string`
* `createdAt: string`

### `TrustedRecipient`

Fields:

* `label: string`
* `walletAddress: string`
* `note?: string`

This one can land after the core is working.

---

## Day 1: Workspace bootstrap and contracts

### Build

Create only the technical foundation:

* root workspace config
* root `package.json`
* base TypeScript config
* `apps/web` package shell
* `apps/qvac-agent` package shell
* `packages/shared` package shell
* `programs/payguard_escrow` Anchor shell

Define shared contracts:

* `PaymentIntent`
* `OcrExtraction`
* `RiskVerdict`
* `Receipt`
* `TrustedRecipient`

Add placeholder module files for:

* web screens
* QVAC adapters
* risk engine
* Solana client helpers
* Anchor program entry

### Technical target

By end of day:

* repo layout is stable
* interfaces are named
* file ownership is clear

### Test

* verify the directory structure is correct
* verify package boundaries make sense
* verify shared types are sufficient for the planned flow

---

## Day 2: Frontend shell and screen wiring

### Build

Create the initial web shell with these screens:

* landing / connect wallet
* payment intent form
* upload review screen
* verdict screen
* receipt screen

Implement only local state flow first:

* manual form input
* mock uploaded file metadata
* route or state transitions between screens

Create core UI modules:

* `WalletConnectCard`
* `PaymentIntentForm`
* `DocumentUploadPanel`
* `ReviewPanel`
* `VerdictCard`
* `ReceiptCard`

### Technical target

By end of day:

* a mocked happy path exists in the browser
* no QVAC and no Solana logic is required yet

### Test

* click through the full UI flow with mock data
* verify required fields are validated at the form level
* verify screen state is serializable and easy to debug

---

## Day 3: QVAC OCR integration and extraction normalization

### Build

Implement the first real QVAC-powered module:

* OCR adapter in `apps/qvac-agent/src/ocr.ts`
* extraction normalizer in `apps/qvac-agent/src/normalize.ts`
* web bridge for passing uploaded file content into the local agent

The OCR stage should produce:

* raw extracted text
* normalized payment fields
* fallback behavior when extraction is partial

Create demo fixtures for:

* safe supplier invoice
* urgent fake screenshot
* first-time vendor request

### Technical target

By end of day:

* document upload is not mock-only anymore
* OCR results feed the review UI

### Test

* safe invoice extracts usable payment info
* scam screenshot extracts enough text to drive risk signals
* partial extraction does not crash the UI
* malformed image input returns a controlled error state

---

## Day 4: Risk engine and optional trusted recipient memory

### Build

Implement `apps/qvac-agent/src/risk-engine.ts`.

The first rule engine should evaluate:

* missing recipient information
* new wallet address
* urgency language
* amount anomaly threshold
* claimed name vs wallet mismatch

Return:

* verdict
* reasons
* triggered signals

If still on schedule, add local trusted recipient memory:

* small local store
* lookup by label
* lookup by wallet
* mismatch detection

### Technical target

By end of day:

* the review output is generated from actual OCR/manual input
* the verdict is deterministic for the demo scenarios

### Test

* known clean payment returns `Safe`
* first-time recipient returns `Review`
* urgent changed-wallet request returns `Block`
* optional trusted recipient lookup behaves correctly for:
  * known label + known wallet
  * known label + changed wallet
  * unknown label

---

## Day 5: Direct send on Solana devnet

### Build

Implement the first real onchain path in `apps/web/lib/solana/`.

Modules to add:

* wallet provider setup
* devnet connection helper
* SPL token transfer builder
* transaction send helper
* receipt persistence helper

Support:

* Phantom
* Solflare
* chosen devnet stablecoin mint

UI should now:

* connect wallet
* review payment
* execute direct send
* show tx signature
* save a local receipt

### Technical target

By end of day:

* one real payment path works end-to-end

### Test

* connect Phantom successfully
* connect Solflare successfully
* sign and send a devnet transfer
* confirm tx signature is displayed
* confirm receipt contains tx metadata

---

## Day 6: Guarded payment program and client integration

### Build

Implement the Anchor program in `programs/payguard_escrow/src/lib.rs`.

Instructions:

* `create_guarded_payment`
* `cancel_guarded_payment`
* `claim_guarded_payment`

State:

* payer
* recipient
* token mint
* amount
* unlock time
* intent hash
* status

Wire the web app to call guarded payment for `Review` flows.

If the core path is already stable, add exactly one stretch feature:

* trusted recipient memory
* QR scan
* voice payment input

Choose only one unless the schedule is clearly ahead.

### Technical target

By end of day:

* medium-risk payments can use guarded flow
* the app now has both direct and guarded payment paths

### Test

* Anchor test for create
* Anchor test for cancel
* Anchor test for claim
* client can create guarded payment from web flow
* receipt correctly distinguishes direct vs guarded mode

---

## Day 7: Demo hardening and selective polish

### Build

Stabilize the product for submission:

* tighten copy on verdict screen
* add better loading / error handling
* add resettable demo fixtures
* make the three main demo paths reliable

Optional polish if and only if core is stable:

* text-to-speech warning
* translation
* voice payment input

Do not add polish if:

* direct send is flaky
* guarded flow is flaky
* OCR is inconsistent
* verdict reasons are unclear

### Technical target

By end of day:

* the demo is reliable enough to run without improvisation

### Test

Run the full demo set:

* safe invoice -> `Safe` -> direct send
* fake urgent screenshot -> `Block` -> no send
* first-time vendor -> `Review` -> guarded payment

Also verify:

* wallet reconnect works
* receipt generation works
* demo reset works
* there are no dead screens or broken transitions

---

## Delivery rule

If time starts slipping, cut in this order:

1. translation
2. text-to-speech
3. voice input
4. QR scan
5. trusted recipient memory

Do not cut:

* OCR
* verdict engine
* direct send
* guarded payment
* receipt

That is the actual technical core of PayGuard.
