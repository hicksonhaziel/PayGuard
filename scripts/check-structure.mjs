import { access } from "node:fs/promises";

const required = [
  "apps/web/app/page.tsx",
  "apps/desktop/src/main.ts",
  "apps/qvac-agent/src/index.ts",
  "packages/shared/src/index.ts",
  "programs/payguard_escrow/src/lib.rs"
];

await Promise.all(required.map((file) => access(file)));

console.log("Project structure looks good.");
