// AJV errors are an implementation detail; diagnostics are the public repair interface.
// Keep JSON pointers and machine-readable expectations alongside readable messages.
const escapePointer = (s) => s.replaceAll('~', '~0').replaceAll('/', '~1');
const unescapePointer = (s) => s.replaceAll('~1', '/').replaceAll('~0', '~');
function at(value, pointer) {
  for (const key of pointer.split('/').slice(1).map(unescapePointer)) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}
const within = (path, parent) => path === parent || path.startsWith(`${parent}/`);
function preview(value) {
  if (value === undefined) return {type:'missing'};
  if (typeof value === 'string') return value.length > 240 ? {type:'string', length:value.length, preview:value.slice(0,240), truncated:true} : value;
  if (Array.isArray(value)) return {type:'array', length:value.length};
  if (value && typeof value === 'object') return {type:'object', keys:Object.keys(value).slice(0,20), ...(Object.keys(value).length > 20 ? {truncated:true} : {})};
  return Number.isFinite(value) || typeof value !== 'number' ? value : {type:'number',value:String(value)};
}
function recordAt(input, pointer) {
  let path = pointer;
  while (true) {
    const value = at(input, path);
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.id === 'string') return {id:value.id, path:path || '/', ...(typeof (value.label ?? value.title) === 'string' ? {label:preview(value.label ?? value.title)} : {})};
    if (!path) return undefined;
    path = path.slice(0, path.lastIndexOf('/'));
  }
}
const rootIndexes = new WeakMap();
function schemaRoots(root, ajv) {
  if (rootIndexes.has(root)) return rootIndexes.get(root);
  const roots = new WeakMap();
  function visit(schema, document) {
    if (!schema || typeof schema !== 'object' || roots.has(schema)) return;
    roots.set(schema, document);
    for (const child of Object.values(schema)) visit(child, document);
    if (schema.$ref && !schema.$ref.startsWith('#')) {
      const external = ajv.getSchema(schema.$ref.split('#')[0])?.schema;
      visit(external, external);
    }
  }
  visit(root, root);
  rootIndexes.set(root, roots);
  return roots;
}
function resolveBranch(schema, schemaPath, root, ajv, roots) {
  const seen = new Set();
  while (schema?.$ref) {
    if (seen.has(schema)) return {schema:null, schemaPath};
    seen.add(schema);
    const ref = schema.$ref;
    const [file, fragment = ''] = ref.split('#');
    const document = file ? ajv.getSchema(file)?.schema : roots.get(schema) ?? root;
    schemaPath = ref;
    schema = fragment ? at(document, fragment) : document;
  }
  return {schema, schemaPath};
}

// AJV may compile a referenced definition as its own schema root, making
// schemaPath relative to that definition. Match schema objects, not path aliases.
function schemaObjects(schema, schemaPath, root, ajv, roots, seen = new Set()) {
  if (!schema || typeof schema !== 'object' || seen.has(schema)) return seen;
  seen.add(schema);
  if (schema.$ref) {
    const resolved = resolveBranch(schema, schemaPath, root, ajv, roots);
    schemaObjects(resolved.schema, resolved.schemaPath, root, ajv, roots, seen);
  }
  for (const [key, child] of Object.entries(schema)) {
    if (child && typeof child === 'object') schemaObjects(child, `${schemaPath}/${key}`, root, ajv, roots, seen);
  }
  return seen;
}

export function schemaDiagnostics(errors, input, code, {root, ajv}) {
  const roots = schemaRoots(root, ajv);
  const excluded = [], summaries = new Set(), synthetic = [];
  const ignored = (e) => excluded.some((x) => within(e.instancePath, x.path) && x.schemas.has(e.parentSchema));
  // Only prune variants when their explicit discriminators identify a unique shape.
  // Shared definitions are retained; exclusions are also scoped to the data path.
  for (const e of [...errors].filter((e) => e.keyword === 'oneOf').sort((a,b) => a.instancePath.length - b.instancePath.length)) {
    if (ignored(e)) continue;
    const object = at(input, e.instancePath);
    if (!object || typeof object !== 'object' || Array.isArray(object)) continue;
    const branches = e.schema.map((s,i) => resolveBranch(s, `${e.schemaPath}/${i}`, root, ajv, roots));
    const key = ['status','kind'].find((key) => branches.every(({schema}) => schema?.properties?.[key] && (Object.hasOwn(schema.properties[key], 'const') || schema.properties[key].enum)));
    if (!key) continue;
    const choices = branches.map(({schema}) => schema.properties[key].enum ?? [schema.properties[key].const]);
    const value = at(input, `${e.instancePath}/${key}`);
    const matches = choices.flatMap((list,i) => list.includes(value) ? [i] : []);
    if (matches.length > 1) continue;
    const retained = matches.length ? schemaObjects(branches[matches[0]].schema, branches[matches[0]].schemaPath, root, ajv, roots) : new Set();
    branches.forEach((b,i) => {
      if (i === matches[0]) return;
      const schemas = schemaObjects(b.schema, b.schemaPath, root, ajv, roots);
      for (const shared of retained) schemas.delete(shared);
      excluded.push({path:e.instancePath, schemas});
    });
    summaries.add(e);
    if (!matches.length) {
      const allowedValues = [...new Set(choices.flat())];
      synthetic.push({instancePath:`${e.instancePath}/${key}`, schemaPath:e.schemaPath, keyword:'enum', params:{allowedValues}});
    }
  }
  let selected = errors.filter((e) => !ignored(e) && !summaries.has(e));
  // Conditional/union summaries add no repair information when specific errors survive.
  selected = selected.filter((e) => !['if','oneOf','anyOf'].includes(e.keyword) || !selected.some((other) => other !== e && !['if','oneOf','anyOf'].includes(other.keyword) && within(other.instancePath,e.instancePath)));
  const seen = new Set();
  return [...selected, ...synthetic].map((e) => {
    const p=e.params, parent=e.parentSchema ?? {};
    let path=e.instancePath, expected={}, instruction;
    if (e.keyword === 'required') path += `/${escapePointer(p.missingProperty)}`;
    if (e.keyword === 'additionalProperties') path += `/${escapePointer(p.additionalProperty)}`;
    const value=at(input,path), received=preview(value);
    switch(e.keyword) {
      case 'enum': expected={allowedValues:p.allowedValues};instruction=`Expected one of ${JSON.stringify(p.allowedValues)}.`;break;
      case 'const': expected={value:p.allowedValue};instruction=`Expected ${JSON.stringify(p.allowedValue)}.`;break;
      case 'type': expected={type:p.type};instruction=`Expected type ${JSON.stringify(p.type)}.`;break;
      case 'required': expected={requiredProperty:p.missingProperty};instruction=`Required property ${JSON.stringify(p.missingProperty)} is missing.`;break;
      case 'additionalProperties': expected={allowedProperties:Object.keys(parent.properties ?? {})};instruction=`Unsupported property ${JSON.stringify(p.additionalProperty)}. Allowed properties here: ${JSON.stringify(expected.allowedProperties)}.`;break;
      case 'pattern': expected={pattern:p.pattern};instruction=`String must match ${JSON.stringify(p.pattern)}.`;break;
      case 'minLength': case 'maxLength': expected={[e.keyword]:p.limit};instruction=`String must have ${e.keyword === 'minLength' ? 'at least' : 'at most'} ${p.limit} characters.`;break;
      case 'minItems': case 'maxItems': expected={[e.keyword]:p.limit};instruction=`Array must have ${e.keyword === 'minItems' ? 'at least' : 'at most'} ${p.limit} items.`;break;
      case 'uniqueItems': expected={uniqueItems:true};instruction=`Array items at indexes ${p.i} and ${p.j} are duplicates; values must be unique.`;break;
      case 'minimum': case 'maximum': case 'exclusiveMinimum': case 'exclusiveMaximum': expected={[e.keyword]:p.limit};instruction=`Number must be ${p.comparison} ${p.limit}.`;break;
      case 'false schema': expected={supported:false};instruction='This field or shape is not supported by the selected schema version.';break;
      case 'oneOf': case 'anyOf': expected={matchingShapes:e.keyword === 'oneOf' ? 'exactly one' : 'at least one'};instruction=`Expected ${expected.matchingShapes} valid schema shape. Check the selected kind/status and its required fields.`;break;
      default: expected={...p};instruction=`Validation constraint ${e.keyword} failed: ${e.message ?? 'invalid value'}.`;
    }
    const record=recordAt(input,path);
    return {code,path:path || '/',message:`At ${path || '/'}${record ? ` (record ${JSON.stringify(record.id)})` : ''}: ${instruction} Received ${JSON.stringify(received)}.`, keyword:e.keyword, expected, received, ...(record?{record}:{}), schemaPath:e.schemaPath, details:p};
  }).filter((d) => {const key=JSON.stringify([d.path,d.keyword,d.expected]);if(seen.has(key))return false;seen.add(key);return true;});
}

export function referenceDiagnostic(input, ref, allowed, path, entries, code) {
  const actual = entries.get(ref)?.collection;
  const candidates = [...entries].filter(([,entry]) => allowed.includes(entry.collection)).map(([id]) => id);
  const availableRefs = candidates.slice(0,20);
  const record = recordAt(input,path);
  return {code,path,keyword:'reference',
    message:`At ${path}: ${JSON.stringify(ref)} ${actual ? `references ${actual}` : 'does not identify a registered record'}; expected ${allowed.join(' or ')}. ${candidates.length ? `${candidates.length > availableRefs.length ? 'Examples of valid' : 'Valid'} IDs: ${JSON.stringify(availableRefs)}.` : 'No records of those types are registered.'}`,
    expected:{collections:allowed,availableRefs,availableCount:candidates.length},received:{ref,collection:actual ?? null},...(record?{record}:{})};
}

export function prefixDiagnostics(diagnostics, prefix) {
  return diagnostics.map((d) => ({...d, path:prefix+(d.path === '/' ? '' : d.path),
    ...(d.record ? {record:{...d.record,path:prefix+(d.record.path === '/' ? '' : d.record.path)}} : {}),
    message:d.message.startsWith(`At ${d.path}`) ? `At ${prefix}${d.path === '/' ? '' : d.path}${d.message.slice(3+d.path.length)}` : d.message}));
}
