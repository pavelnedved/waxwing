import { canonical, digest } from '../shared/model.mjs';

// Inputs are validated, document-resolved models. This is an inventory, not semantic interpretation.
export function compareModelRecords(before,after) {
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
