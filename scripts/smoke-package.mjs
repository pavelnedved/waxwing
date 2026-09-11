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
  for (const required of ['bin/waxwing.mjs', 'schemas/system-model.schema.json', 'AGENT_GUIDE.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'examples/waxwing/model.json']) {
    assert.ok(paths.includes(required), `Missing package file: ${required}`);
  }
  // Explicit archive/registry specs may still use the earlier internal layout.
  assert.ok(['modules/presentation/render/diagram.css', 'modules/render/diagram.css'].some(file => paths.includes(file)), 'Missing diagram stylesheet');
  assert.ok(!paths.some(file => /(^|\/)(\.internal|\.git|\.github|node_modules|generated|experiments)(\/|$)/.test(file)), 'Archive contains development/private output');
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"private":true,"type":"module"}\n');
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(temporary, pack.filename)]);
  const installed = path.join(temporary, 'node_modules', pack.name);
  const cli = path.join(temporary, 'node_modules/.bin/waxwing');
  assert.match(run(cli, ['--help']), /build-site/);
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')));
  run(process.execPath, ['--input-type=module', '-e', `for (const entry of ${JSON.stringify(Object.keys(manifest.exports))}) await import(${JSON.stringify(manifest.name + '/')} + entry.slice(2));`]);
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
  const collection=path.join(temporary,'library');
  run(cli,['build-collection',path.join(installed,'examples/collection/collection.json'),collection]);
  run(cli,['recover',path.join(collection,'sites/checkout'),path.join(temporary,'collection-recovered.json')]);
  const query=JSON.parse(run(cli,['query',path.join(collection,'sites/checkout/source/model.json'),'search','stock','--kind','component']));
  assert.ok(query.ok&&query.results.some(r=>r.id==='stock'));
  const skill=path.join(temporary,'skills/waxwing');
  run(cli,['skill','install',skill]);
  const adapter=path.join(skill,'scripts/waxwing.mjs');
  const binding=JSON.parse(run(process.execPath,[adapter,'check']));
  assert.equal(binding.packageRoot,fs.realpathSync(installed));
  const topics=JSON.parse(run(process.execPath,[adapter,'guide','list']));assert.ok(topics.some(t=>t.topic==='architecture'));
  const skillInput=path.join(collection,'sites/checkout/source/model.json');
  run(process.execPath,[adapter,'build-site',skillInput,path.join(temporary,'skill-output')]);
  const review=JSON.parse(run(process.execPath,[adapter,'review-update',skillInput,skillInput]));
  assert.deepEqual(review.counts,{added:0,removed:0,changed:0,unchanged:review.counts.unchanged});
  const workspaceInput=path.join(installed,'examples/workspace/workspace.json');
  const workspace=JSON.parse(run(cli,['workspace','check',workspaceInput]));
  assert.equal(workspace.ok,true);assert.equal(workspace.referencesComplete,false);
  const plan=JSON.parse(run(process.execPath,[adapter,'workspace','affected',workspaceInput,'--source','retry-design']));
  assert.deepEqual(plan.reviews.map(m=>m.id),['organization','checkout','retry']);
  assert.deepEqual(plan.unaffected,['markets']);
  assert.match(run(process.execPath,[adapter,'guide','workspace']),/workspace affected/);
  console.log(`Package smoke check passed: ${manifest.name}@${manifest.version}, ${paths.length} files, ${pack.size} compressed bytes; integrity ${pack.integrity}; exports, recovery, collections, queries, workspace lineage, installed skill binding/build/update passed.`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
