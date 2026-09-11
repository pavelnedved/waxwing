import fs from 'node:fs';
import path from 'node:path';
import {loadModel} from '../documents/index.mjs';
import {canonical,digest} from '../shared/model.mjs';

const topics={
  basics:['Choose the question and model','Investigate and preserve meaning','Shared field rules'],
  architecture:['Architecture JSON 1','Architecture subgraphs'],
  workflows:['Architecture workflows','Scoped entry and trigger'],
  sequence:['Sequence JSON 1','Scoped entry and trigger'],
  behavior:['Sequence loops and if/else'],
  documents:['Markdown documents and references'],
  pipeline:['Run the pipeline','Troubleshooting and completion','Compatibility and maintenance'],
  'example-architecture':['Complete architecture example'],
  'example-scenario':['Complete sequence scenario example'],
  'example-behavior':['Complete sequence behavior example'],
};

export function guideSections(guide) {
  const sections=new Map();let heading,body=[],fence;
  const finish=()=>{if(heading){if(sections.has(heading))throw new Error(`Repeated guide section: ${heading}`);sections.set(heading,body.join('\n').trim()+'\n');}};
  for(const line of guide.split('\n')) {
    const marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if(marker) {
      if(!fence)fence={char:marker[1][0],length:marker[1].length};
      else if(marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;
    }
    const title=!fence&&line.match(/^## (.+)$/);
    if(title){finish();heading=title[1];body=[];}
    if(heading)body.push(line);
  }
  finish();return sections;
}

export function readGuide(root,topic) {
  const sections=guideSections(fs.readFileSync(path.join(root,'AGENT_GUIDE.md'),'utf8'));
  const contents=new Map(Object.entries(topics).map(([name,titles])=>[name,titles.map(title=>{
    if(!sections.has(title))throw new Error(`Missing guide section: ${title}`);return sections.get(title);
  }).join('\n')]));
  for(const [name,file] of [['collections','collections.md'],['queries','model-queries.md']])contents.set(name,fs.readFileSync(path.join(root,'docs',file),'utf8'));
  if(topic==='list')return JSON.stringify([...contents].map(([name,text])=>({topic:name,characters:text.length})),null,2);
  if(!contents.has(topic))throw new Error(`Unknown guide topic "${topic}". Use guide list.`);
  const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  return `Waxwing ${version} · ${topic}\nSource: ${path.join(root,['collections','queries'].includes(topic)?`docs/${topic==='queries'?'model-queries':'collections'}.md`:'AGENT_GUIDE.md')}\nUse the installed skill adapter for the CLI examples below; relative documentation links resolve from the source above.\n\n${contents.get(topic)}`;
}

export function reviewUpdate(beforeFile,afterFile) {
  const before=loadModel(beforeFile).model,after=loadModel(afterFile).model;
  const records=model=>{
    const all=new Map();
    for(const [collection,values] of Object.entries(model))if(Array.isArray(values))for(const record of values) {
      if(!record?.id)continue;
      all.set(record.id,{collection,record});
      if(collection==='workflows')for(const step of record.steps)all.set(step.id,{collection:'workflowSteps',workflowRef:record.id,record:step});
    }
    return all;
  };
  const old=records(before),next=records(after),added=[],removed=[],changed=[],unchanged=[];
  const summary=({collection,workflowRef,record})=>({id:record.id,collection,...(workflowRef?{workflowRef}:{}),label:record.title??record.label??record.id});
  for(const [id,item] of next) {
    if(!old.has(id))added.push(summary(item));
    else if(canonical(item)!==canonical(old.get(id)))changed.push({...summary(item),previousLabel:summary(old.get(id)).label,previousCollection:old.get(id).collection});
    else unchanged.push(id);
  }
  for(const [id,item] of old)if(!next.has(id))removed.push(summary(item));
  const header=model=>Object.fromEntries(Object.entries(model).filter(([,v])=>!Array.isArray(v)));
  const oldHeader=header(before),newHeader=header(after);
  const fields=[...new Set([...Object.keys(oldHeader),...Object.keys(newHeader)])].filter(k=>canonical(oldHeader[k])!==canonical(newHeader[k]));
  return {before:{id:before.id,revision:digest(before)},after:{id:after.id,revision:digest(after)},
    identityChanged:before.id!==after.id,diagramTypeChanged:(before.diagramType??'architecture')!==(after.diagramType??'architecture'),
    scopeChanged:canonical(before.scope)!==canonical(after.scope),modelFieldsChanged:fields,
    added,removed,changed,unchanged,counts:{added:added.length,removed:removed.length,changed:changed.length,unchanged:unchanged.length},
    semantics:'Validated record inventory, not a semantic diff or identity proof. Renames appear as remove/add; inspect them together. Workflow changes can also list their changed steps. No changes have been applied.'};
}
