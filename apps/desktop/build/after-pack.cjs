const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const appRoot = path.join(context.appOutDir, "resources", "app");
  const runtimeBinDir = path.join(appRoot, "node_modules", "bare-runtime-linux-x64", "bin");

  if (!fs.existsSync(runtimeBinDir)) {
    return;
  }

  for (const fileName of fs.readdirSync(runtimeBinDir)) {
    fs.chmodSync(path.join(runtimeBinDir, fileName), 0o755);
  }
};
