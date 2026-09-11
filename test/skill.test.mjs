import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {installSkill} from '../modules/skill/index.mjs';
import {readGuide,guideSections,reviewUpdate} from '../modules/skill/workflow.mjs';
import {loadModel} from '../modules/documents/index.mjs';
import {recoverSite} from '../modules/site/files.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'waxwing skill '));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2));
const run=(script,...args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',cwd:os.tmpdir()});
const adapter=dir=>path.join(dir,'scripts/waxwing.mjs');
const example=kind=>JSON.parse(readGuide(root,`example-${kind}`).match(/```json\n([\s\S]*?)\n```/)[1]);

test('installer is explicit, relocatable as a skill, and preserves package-bound guide/CLI behavior',()=>{
  const dir=temp();try {
    const target=path.join(dir,'waxwing');const installed=installSkill(target);
    assert.equal(installed.entrypoint,path.join(target,'SKILL.md'));
    const check=run(adapter(target),'check');assert.equal(check.status,0,check.stderr);assert.equal(JSON.parse(check.stdout).packageRoot,fs.realpathSync(root));
    const guide=run(adapter(target),'guide','architecture');assert.equal(guide.status,0,guide.stderr);assert.ok(guide.stdout.length<fs.statSync(path.join(root,'AGENT_GUIDE.md')).size);
    const topics=JSON.parse(run(adapter(target),'guide','list').stdout);assert.ok(topics.some(t=>t.topic==='behavior'));
    const bad=run(adapter(target),'guide','made-up');assert.equal(bad.status,1);assert.match(bad.stderr,/Unknown guide topic/);
    const moved=path.join(dir,'moved skill');fs.renameSync(target,moved);assert.equal(run(adapter(moved),'check').status,0);
    assert.equal(run(adapter(moved),'--help').status,0);
    installSkill(moved);assert.equal(run(adapter(moved),'check').status,0);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('packaged guide examples execute through the installed adapter for all model families',()=>{
  const dir=temp();try {
    const target=path.join(dir,'skill');installSkill(target);
    for(const kind of ['architecture','scenario','behavior']) {
      const model=example(kind),input=path.join(dir,`${kind}.json`),out=path.join(dir,kind);write(input,model);
      for(const args of [['validate',input],['build-site',input,out]]) {
        const result=run(adapter(target),...args);assert.equal(result.status,0,result.stderr);
      }
      assert.deepEqual(recoverSite(out),model);
      assert.equal(JSON.parse(run(adapter(target),'query',input,'inspect',model.id).stdout).ok,true);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('update rehearsal preserves document-backed authoring and reports changed, added and removed IDs',()=>{
  const dir=temp();try {
    const target=path.join(dir,'skill');installSkill(target);
    const model=example('architecture'),input=path.join(dir,'model.json'),before=path.join(dir,'before.json');
    const docs=path.join(dir,'docs');fs.mkdirSync(docs);
    model.documents=model.documents.map(({id,title,format,attachments,markdown})=>{fs.writeFileSync(path.join(docs,`${id}.md`),markdown);return {id,title,format,attachments,file:`docs/${id}.md`};});write(input,model);
    let result=run(adapter(target),'prepare',input,before);assert.equal(result.status,0,result.stderr);
    const baseline=fs.readFileSync(before,'utf8'),ids=model.entities.map(e=>e.id);
    model.entities[0].label+=' — revised';model.scope.snapshot='Updated fixture';
    const removed=model.notes.pop();const added=structuredClone(removed);added.id='new-review-note';model.notes.push(added);
    const doc=path.join(docs,`${model.documents[0].id}.md`);fs.appendFileSync(doc,'\nAdditional explanation of the revised fixture.\n');write(input,model);
    const authoring=fs.readFileSync(input,'utf8');result=run(adapter(target),'review-update',before,input);assert.equal(result.status,0,result.stderr);
    const review=JSON.parse(result.stdout);assert.equal(review.identityChanged,false);assert.equal(review.scopeChanged,true);
    assert.ok(review.changed.some(r=>r.id===model.entities[0].id));assert.ok(review.changed.some(r=>r.id===model.documents[0].id));
    assert.ok(review.removed.some(r=>r.id===removed.id));assert.ok(review.added.some(r=>r.id===added.id));
    assert.deepEqual(model.entities.map(e=>e.id),ids);assert.equal(fs.readFileSync(before,'utf8'),baseline);assert.equal(fs.readFileSync(input,'utf8'),authoring);
    const out=path.join(dir,'site');result=run(adapter(target),'build-site',input,out);assert.equal(result.status,0,result.stderr);
    assert.deepEqual(recoverSite(out),loadModel(input).model);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('review validates both inputs and exposes root identity changes instead of guessing renames',()=>{
  const dir=temp();try {
    const before=path.join(dir,'before.json'),after=path.join(dir,'after.json'),model=example('scenario');write(before,model);
    model.id='another-model';// No attachment to the model itself in this example.
    model.documents=[];write(after,model);
    const review=reviewUpdate(before,after);assert.equal(review.identityChanged,true);assert.ok(review.modelFieldsChanged.includes('id'));
    model.steps[0].from='missing';write(after,model);assert.throws(()=>reviewUpdate(before,after));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('installer refuses unrelated, modified, extra and symlinked contents and unsafe destinations',()=>{
  const dir=temp();try {
    const target=path.join(dir,'skill');fs.mkdirSync(target);fs.writeFileSync(path.join(target,'mine.md'),'keep');
    assert.throws(()=>installSkill(target),/not a managed/);assert.equal(fs.readFileSync(path.join(target,'mine.md'),'utf8'),'keep');
    fs.rmSync(target,{recursive:true});installSkill(target);fs.appendFileSync(path.join(target,'SKILL.md'),'my edit');
    assert.throws(()=>installSkill(target),/modified/);assert.ok(fs.readFileSync(path.join(target,'SKILL.md'),'utf8').endsWith('my edit'));
    fs.rmSync(target,{recursive:true});installSkill(target);fs.writeFileSync(path.join(target,'extra.txt'),'keep');assert.throws(()=>installSkill(target),/added or missing/);
    fs.unlinkSync(path.join(target,'extra.txt'));fs.symlinkSync(path.join(target,'SKILL.md'),path.join(target,'link'));assert.throws(()=>installSkill(target),/symlink/);
    const alias=path.join(dir,'alias');fs.symlinkSync(target,alias);assert.throws(()=>installSkill(alias),/real directory/);
    assert.throws(()=>installSkill(root),/outside/);assert.throws(()=>installSkill(path.dirname(root)),/outside/);assert.throws(()=>installSkill(path.join(root,'skills/installed')),/outside/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('changed or moved runtime fails before executing; reinstall refreshes the binding',()=>{
  const dir=temp();try {
    const copy=path.join(dir,'package'),target=path.join(dir,'skill');fs.mkdirSync(copy);
    for(const name of ['package.json','AGENT_GUIDE.md','LICENSE','bin','modules','schemas','docs','skills'])fs.cpSync(path.join(root,name),path.join(copy,name),{recursive:true});
    fs.symlinkSync(path.join(root,'node_modules'),path.join(copy,'node_modules'));
    const cli=path.join(copy,'bin/waxwing.mjs');let result=run(cli,'skill','install',target);assert.equal(result.status,0,result.stderr);
    fs.appendFileSync(path.join(copy,'AGENT_GUIDE.md'),'\nChanged contract revision.\n');
    result=run(adapter(target),'validate','nonexistent.json');assert.equal(result.status,1);assert.match(result.stderr,/package changed/);assert.match(result.stderr,/has not run/);
    result=run(cli,'skill','install',target);assert.equal(result.status,0,result.stderr);assert.equal(run(adapter(target),'check').status,0);
    fs.renameSync(copy,path.join(dir,'moved'));assert.equal(run(adapter(target),'--help').status,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('progressive guide extraction ignores headings in fenced examples and fails on contract drift',()=>{
  const sections=guideSections('## One\ntext\n```markdown\n## Not a section\n```\n## Two\nnext\n');
  assert.deepEqual([...sections.keys()],['One','Two']);assert.ok(sections.get('One').includes('## Not a section'));
  assert.throws(()=>guideSections('## One\na\n## One\nb'),/Repeated/);
  const dir=temp();try {fs.writeFileSync(path.join(dir,'AGENT_GUIDE.md'),'## Wrong\n');assert.throws(()=>readGuide(dir,'list'),/Missing guide section/);}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
});
