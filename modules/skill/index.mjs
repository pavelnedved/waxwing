import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {fingerprint} from '../../skills/waxwing/scripts/runtime.mjs';
import {readGuide} from './workflow.mjs';

const packageRoot=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const manifestName='waxwing-skill.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const validPath=name=>/^(?:SKILL\.md|LICENSE|runtime\.json|agents\/openai\.yaml|references\/[a-z-]+\.md|scripts\/[a-z-]+\.mjs)$/.test(name);
function inventory(dir,prefix='') {
  const files=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const relative=prefix+entry.name;
    if(entry.isSymbolicLink()||!entry.isFile()&&!entry.isDirectory())throw new Error(`Skill contains an unsupported file or symlink: ${relative}`);
    if(entry.isDirectory()) {
      if(!['agents','references','scripts'].includes(relative))throw new Error(`Skill contains an unowned directory: ${relative}`);
      files.push(...inventory(path.join(dir,entry.name),relative+'/'));
    } else files.push(relative);
  }
  return files;
}
function verifyInstalled(dir) {
  const files=inventory(dir);
  if(!files.includes(manifestName))throw new Error('Destination is not a managed Waxwing skill. Choose a new or empty directory.');
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,manifestName),'utf8'));
  if(manifest.schemaVersion!=='0.1-skill-install'||!manifest.files||typeof manifest.files!=='object'||Array.isArray(manifest.files)||!['SKILL.md','runtime.json'].every(p=>Object.hasOwn(manifest.files,p))||Object.entries(manifest.files).some(([p,h])=>!validPath(p)||typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h)))throw new Error('Invalid Waxwing skill manifest.');
  if(files.length!==Object.keys(manifest.files).length+1||files.some(p=>p!==manifestName&&!Object.hasOwn(manifest.files,p)))throw new Error('Skill has added or missing files. Preserve your edits and install to a new directory.');
  for(const [name,expected] of Object.entries(manifest.files))if(hash(fs.readFileSync(path.join(dir,name)))!==expected)throw new Error(`Installed skill file was modified: ${name}. Preserve your edits and install to a new directory.`);
}
function physical(file) {
  const absolute=path.resolve(file);
  if(fs.lstatSync(absolute,{throwIfNoEntry:false}))return fs.realpathSync(absolute);
  const parent=path.dirname(absolute);
  return path.join(physical(parent),path.basename(absolute));
}
const contains=(dir,file)=>{const rel=path.relative(dir,file);return !rel||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};

export function installSkill(directory) {
  if(typeof directory!=='string'||!directory.trim())throw new Error('skill install requires the destination skill directory.');
  const target=path.resolve(directory),actual=physical(target);
  if(contains(actual,packageRoot)||contains(packageRoot,actual))throw new Error('Install the skill outside the Waxwing package, and not into an ancestor of it.');
  if(fs.existsSync(target)) {
    if(fs.lstatSync(target).isSymbolicLink()||!fs.statSync(target).isDirectory())throw new Error('Skill destination must be a real directory.');
    if(fs.readdirSync(target).length)verifyInstalled(target);
  }
  // Fail before any filesystem mutation if a guide section has drifted.
  readGuide(packageRoot,'list');
  const source=path.join(packageRoot,'skills/waxwing'),files=new Map();
  for(const name of inventory(source)) {
    if(!validPath(name))throw new Error(`Unsupported packaged skill file: ${name}`);
    files.set(name,fs.readFileSync(path.join(source,name)));
  }
  const pkg=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8'));
  files.set('LICENSE',fs.readFileSync(path.join(packageRoot,'LICENSE')));
  files.set('runtime.json',JSON.stringify({schemaVersion:'0.1-skill-runtime',packageRoot,version:pkg.version,fingerprint:fingerprint(packageRoot)},null,2)+'\n');
  files.set(manifestName,JSON.stringify({schemaVersion:'0.1-skill-install',files:Object.fromEntries([...files].map(([p,c])=>[p,hash(c)]))},null,2)+'\n');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const staging=fs.mkdtempSync(path.join(path.dirname(target),'.waxwing-skill-')),backup=path.join(path.dirname(target),`.waxwing-skill-backup-${randomUUID()}`);
  let moved=false,installed=false;
  try {
    for(const [name,content] of files){const dest=path.join(staging,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);}
    if(fs.existsSync(target)){fs.renameSync(target,backup);moved=true;}
    fs.renameSync(staging,target);installed=true;
  }catch(error){if(moved&&!installed)fs.renameSync(backup,target);throw error;}
  finally{fs.rmSync(staging,{recursive:true,force:true});if(moved&&installed)fs.rmSync(backup,{recursive:true,force:true});}
  return {directory:target,entrypoint:path.join(target,'SKILL.md'),adapter:path.join(target,'scripts/waxwing.mjs'),version:pkg.version,files:files.size};
}
