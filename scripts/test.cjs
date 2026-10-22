const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const tests = fs.readdirSync(path.join(root, 'tests')).filter(name => name.endsWith('.test.js')).map(name => path.join(root, 'tests', name));
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: path.join(root, 'dist'), stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
