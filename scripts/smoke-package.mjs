// Exercise an actual npm archive from outside the repository. No checkout symlinks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'waxwing-package-'));
function run(command, args, cwd = temporary) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 180_000 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  // An optional archive path or registry spec verifies the exact release artifact.
  assert.ok(process.argv.length <= 3, 'Usage: node scripts/smoke-package.mjs [archive-or-package-spec]');
  const spec = process.argv[2] ? [process.argv[2]] : [];
  const [pack] = JSON.parse(run('npm', ['pack', ...spec, '--json', '--ignore-scripts', '--pack-destination', temporary], root));
  const paths = pack.files.map(file => file.path);
  for (const required of ['bin/waxwing.mjs', 'schemas/system-model.schema.json', 'modules/render/diagram.css', 'AGENT_GUIDE.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'examples/waxwing/model.json']) {
    assert.ok(paths.includes(required), `Missing package file: ${required}`);
  }
  assert.ok(!paths.some(file => /(^|\/)(\.internal|\.git|\.github|node_modules|generated|experiments)(\/|$)/.test(file)), 'Archive contains development/private output');
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"private":true,"type":"module"}\n');
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(temporary, pack.filename)]);
  const installed = path.join(temporary, 'node_modules/waxwing');
  const cli = path.join(temporary, 'node_modules/.bin/waxwing');
  assert.match(run(cli, ['--help']), /build-site/);
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')));
  run(process.execPath, ['--input-type=module', '-e', `for (const entry of ${JSON.stringify(Object.keys(manifest.exports))}) await import('waxwing/' + entry.slice(2));`]);
  for (const [name, example] of [['architecture', 'waxwing'], ['sequence', 'sequence'], ['behavior', 'sequence-markets']]) {
    const input = path.join(installed, 'examples', example, 'model.json');
    const output = path.join(temporary, name);
    const prepared = path.join(temporary, `${name}-prepared.json`);
    const args = name === 'architecture' ? ['--direction', 'DOWN'] : [];
    run(cli, ['validate', input]);
    run(cli, ['prepare', input, prepared]);
    run(cli, ['build', input, output, ...args]);
    run(cli, ['check-layout', path.join(output, 'layout.json')]);
    run(cli, ['render', path.join(output, 'layout.json'), path.join(output, 'rerendered.html')]);
    run(cli, ['build-site', input, `${output}-site`, ...args]);
    for (const artifact of [path.join(output, 'diagram.html'), path.join(output, 'diagram.svg'), path.join(output, 'rerendered.html'), `${output}-site`]) {
      const recovered = path.join(temporary, 'recovered.json');
      run(cli, ['recover', artifact, recovered]);
      assert.deepEqual(JSON.parse(fs.readFileSync(recovered)), JSON.parse(fs.readFileSync(prepared)), `Recovery differs for ${artifact}`);
    }
  }
  console.log(`Package smoke check passed: ${manifest.name}@${manifest.version}, ${paths.length} files, ${pack.size} compressed bytes; integrity ${pack.integrity}; all exports and architecture/sequence/behavior builds recovered successfully.`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
