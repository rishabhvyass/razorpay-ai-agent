#!/usr/bin/env node
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packages = [
  { name: '@mercora/core', dir: 'packages/core' },
  { name: '@mercora/razorpay', dir: 'packages/razorpay' },
  { name: '@mercora/mcp', dir: 'packages/mcp' },
  { name: '@mercora/react', dir: 'packages/react' },
  { name: '@mercora/react-native', dir: 'packages/react-native' },
  { name: 'demo-merchant', dir: 'examples/demo-merchant' },
];

console.log('📦 [Mercora SDK] Building all packages in dependency order...\n');

for (const pkg of packages) {
  const pkgPath = path.join(rootDir, pkg.dir);
  console.log(`🔨 Building ${pkg.name} (${pkg.dir})...`);
  try {
    execSync(`npm --prefix "${pkgPath}" run build`, { stdio: 'inherit' });
    console.log(`✅ ${pkg.name} built successfully.\n`);
  } catch (err) {
    console.error(`❌ Failed to build ${pkg.name}.`);
    process.exit(1);
  }
}

console.log('🎉 All Mercora packages built successfully!');
