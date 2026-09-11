import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Bind the instructions to runtime sources, schemas and docs, even in checkouts
// that have not changed their package version. Dependencies remain npm-managed.
export function fingerprint(root) {
  const hash=createHash('sha256');
  function visit(relative) {
    const file=path.join(root,relative),stat=fs.lstatSync(file);
    if(stat.isSymbolicLink())throw new Error(`Runtime source must not be a symlink: ${relative}`);
    if(stat.isDirectory())for(const name of fs.readdirSync(file).sort())visit(`${relative}/${name}`);
    else if(stat.isFile()) {hash.update(relative);hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}
    else throw new Error(`Unsupported runtime source: ${relative}`);
  }
  for(const name of ['package.json','AGENT_GUIDE.md','bin','modules','schemas','docs','skills'])visit(name);
  return hash.digest('hex');
}

export function boundRuntime(skillDirectory) {
  const binding=JSON.parse(fs.readFileSync(path.join(skillDirectory,'runtime.json'),'utf8'));
  if(binding.schemaVersion!=='0.1-skill-runtime'||typeof binding.packageRoot!=='string'||!path.isAbsolute(binding.packageRoot))throw new Error('Invalid installed skill runtime binding.');
  const pkg=JSON.parse(fs.readFileSync(path.join(binding.packageRoot,'package.json'),'utf8'));
  if(pkg.name!=='@felixfelicis/waxwing'||pkg.version!==binding.version||fingerprint(binding.packageRoot)!==binding.fingerprint)throw new Error('The bound Waxwing package changed.');
  return binding;
}
