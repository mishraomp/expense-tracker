const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (res.status !== 0) {
    process.exit(res.status);
  }
}

function binPath(cwd, bin) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return path.join(cwd, 'node_modules', '.bin', bin + ext);
}

const cwd = process.cwd(); // expects to be run from backend/ folder
const nestBin = binPath(cwd, 'nest');
const tscBin = binPath(cwd, 'tsc');

// Prefer local nest CLI
if (fs.existsSync(nestBin)) {
  console.log('Found local nest CLI. Running nest build...');
  run(nestBin, ['build', '--config', 'nest-cli.json', '--tsc', '-p', 'tsconfig.prod.json']);
  process.exit(0);
}

// Fallback to tsc if available
if (fs.existsSync(tscBin)) {
  console.log('Local tsc found. Compiling TypeScript with tsc...');
  run(tscBin, ['-p', 'tsconfig.prod.json']);
  process.exit(0);
}

// As a last resort, try npx which may download temporarily (won't be used in CI)
try {
  const np = spawnSync('npx', ['--no-install', 'nest', 'build', '--config', 'nest-cli.json', '--tsc', '-p', 'tsconfig.prod.json'], { stdio: 'inherit' });
  if (np.status === 0) {
    process.exit(0);
  }
} catch (e) {
  // ignore
}

console.error('\nUnable to find local `nest` or `tsc` binaries.');
console.error('Please run `npm install` in backend to install devDependencies or run `npm ci` before `npm run build:prod`.');
console.error('If you intentionally built without devDependencies, provide a local `tsc` CLI in devDependencies or change your workflow to install devDependencies during build.');
process.exit(1);
