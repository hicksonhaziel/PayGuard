import { existsSync } from "node:fs";

const requiredPaths = [
  "package.json",
  "tsconfig.base.json",
  "Anchor.toml",
  "Cargo.toml",
  "apps/web/package.json",
  "apps/web/app/page.tsx",
  "apps/web/components/WalletConnectCard.tsx",
  "apps/web/lib/solana/client.ts",
  "apps/qvac-agent/package.json",
  "apps/qvac-agent/src/ocr.ts",
  "apps/qvac-agent/src/risk-engine.ts",
  "packages/shared/package.json",
  "packages/shared/src/types.ts",
  "programs/payguard_escrow/Cargo.toml",
  "programs/payguard_escrow/src/lib.rs",
  "tests/README.md"
];

const missing = requiredPaths.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.error("Missing required Day 1 paths:");
  for (const path of missing) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

console.log("Day 1 structure check passed.");

