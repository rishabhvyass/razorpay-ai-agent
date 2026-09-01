#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const externalTestDir = path.resolve(rootDir, "../mercora-sdk-test");

const testSuites = [
  { name: "@mercora/core tests", cmd: "node packages/core/test/core.test.mjs", cwd: rootDir },
  { name: "@mercora/razorpay tests", cmd: "node packages/razorpay/test/razorpay.test.mjs", cwd: rootDir },
  { name: "@mercora/mcp tests", cmd: "node packages/mcp/test/mcp.test.mjs", cwd: rootDir },
  { name: "@mercora/react tests", cmd: "npm --prefix packages/react test", cwd: rootDir },
  { name: "@mercora/react-native tests", cmd: "npm --prefix packages/react-native test", cwd: rootDir },
  { name: "demo-merchant execution", cmd: `npm --prefix "${path.join(rootDir, "examples/demo-merchant")}" run start`, cwd: rootDir },
  { name: "external consumer test suite (mercora-sdk-test)", cmd: "npm test", cwd: externalTestDir }
];

console.log("🧪 [Mercora Master SDK Test Suite] Running all 5 package test suites and merchant validations...\n");

let passed = 0;
let failed = 0;

for (const suite of testSuites) {
  console.log(`▶️ Running ${suite.name}...`);
  try {
    execSync(suite.cmd, { cwd: suite.cwd, stdio: "inherit" });
    console.log(`✅ ${suite.name} passed.\n`);
    passed++;
  } catch (err) {
    console.error(`❌ ${suite.name} failed.\n`);
    failed++;
  }
}

console.log("================================================================================");
console.log(`📊 Master Test Suite Summary: ${passed} passed, ${failed} failed`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All Mercora SDK packages and merchant suites certified successfully!\n");
}
