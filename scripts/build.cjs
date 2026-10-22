const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', root], { stdio: 'inherit' });
for (const name of fs.readdirSync(root)) {
  if (/\.(html|css)$/.test(name)) fs.copyFileSync(path.join(root, name), path.join(dist, name));
}
