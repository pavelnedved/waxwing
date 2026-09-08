import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { graphDiagnostics } from '../graphs/index.mjs';
import { documentDiagnostics } from '../documents/markdown.mjs';

const schema = JSON.parse(fs.readFileSync(new URL('../../schemas/system-model.schema.json', import.meta.url), 'utf8'));
const validateShape = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true }).compile(schema);
const collections = ['sources', 'perspectives', 'entities', 'groups', 'memberships', 'relationships', 'notes', 'documents', 'graphs'];
const escapePointer = (value) => value.replaceAll('~', '~0').replaceAll('/', '~1');

function walk(value, path, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value, path);
  for (const [key, child] of Object.entries(value)) {
    walk(child, `${path}/${escapePointer(key)}`, visit);
  }
}

function candidates(knowledge, path) {
  if (knowledge.status === 'unknown') return [];
  if (knowledge.status === 'disputed') {
    return knowledge.alternatives.map((claim, index) => ({ claim, path: `${path}/alternatives/${index}` }));
  }
  return [{ claim: knowledge, path }];
}

export function validateModel(model) {
  if (!validateShape(model)) {
    return {
      ok: false,
      diagnostics: validateShape.errors.map((error) => ({
        code: 'schema/invalid',
        path: error.instancePath || '/',
        message: error.message,
        details: error.params,
      })),
    };
  }

  const diagnostics = [];
  const add = (code, path, message) => diagnostics.push({ code, path, message });
  const entries = new Map();
  for (const collection of collections) {
    (model[collection] ?? []).forEach((item, index) => {
      const path = `/${collection}/${index}`;
      if (entries.has(item.id)) add('identity/duplicate', `${path}/id`, `ID "${item.id}" already occurs at ${entries.get(item.id).path}.`);
      else entries.set(item.id, { item, collection, path });
    });
  }

  function reference(id, allowed, path) {
    const entry = entries.get(id);
    if (!entry || !allowed.includes(entry.collection)) {
      add('reference/invalid', path, `"${id}" must reference ${allowed.join(' or ')}.`);
      return null;
    }
    return entry;
  }

  const unresolved = [];
  const qualifications = [];
  walk(model, '', (value, path) => {
    if (value.sourceRefs) value.sourceRefs.forEach((id, index) => reference(id, ['sources'], `${path}/sourceRefs/${index}`));
    if (['unknown', 'disputed'].includes(value.status)) unresolved.push({ path, status: value.status, reason: value.reason });
    if (['reported', 'inferred'].includes(value.status)) qualifications.push({ path, status: value.status });
    if (value.status === 'disputed') {
      const seen = new Set();
      value.alternatives.forEach((alternative, index) => {
        const key = JSON.stringify(alternative.value);
        if (seen.has(key)) add('knowledge/duplicate-alternative', `${path}/alternatives/${index}/value`, 'A dispute needs distinct alternative values; repeated evidence for the same value is not a dispute.');
        seen.add(key);
      });
    }
  });

  model.relationships.forEach((relationship, index) => {
    const path = `/relationships/${index}`;
    for (const endpoint of ['from', 'to']) {
      const entry = reference(relationship[endpoint], ['entities'], `${path}/${endpoint}`);
      if (!entry) continue;
      const existence = relationship.existence;
      const entityExistence = entry.item.existence;
      if (['established', 'reported', 'inferred'].includes(existence.status) && existence.value === true &&
          entityExistence.status === 'established' && entityExistence.value === false) {
        add('relationship/absent-endpoint', `${path}/${endpoint}`, 'An asserted existing relationship cannot use an endpoint established as absent.');
      } else if (existence.status === 'established' && existence.value === true &&
                 !(entityExistence.status === 'established' && entityExistence.value === true)) {
        add('relationship/uncertain-endpoint', `${path}/${endpoint}`, 'Establish the endpoint existence or qualify the relationship; uncertainty must not silently disappear.');
      }
    }
  });

  model.groups.forEach((group, index) => reference(group.perspectiveRef, ['perspectives'], `/groups/${index}/perspectiveRef`));
  const membershipKeys = new Set();
  const containment = new Map();
  model.memberships.forEach((membership, index) => {
    const path = `/memberships/${index}`;
    reference(membership.perspectiveRef, ['perspectives'], `${path}/perspectiveRef`);
    const member = reference(membership.memberRef, ['entities', 'groups'], `${path}/memberRef`);
    const key = `${membership.memberRef}:${membership.perspectiveRef}`;
    if (membershipKeys.has(key)) add('membership/duplicate-perspective', path, 'This draft permits one membership claim per member and perspective. Put competing assignments in one disputed claim.');
    membershipKeys.add(key);
    if (member?.collection === 'groups' && member.item.perspectiveRef !== membership.perspectiveRef) {
      add('membership/perspective', `${path}/perspectiveRef`, 'Nested groups must use the same grouping perspective.');
    }
    for (const candidate of candidates(membership.group, `${path}/group`)) {
      const target = reference(candidate.claim.value, ['groups'], `${candidate.path}/value`);
      if (target && target.item.perspectiveRef !== membership.perspectiveRef) add('membership/perspective', `${candidate.path}/value`, 'The target group must use the declared membership perspective.');
      if (candidate.claim.value === membership.memberRef) add('membership/self', `${candidate.path}/value`, 'A group cannot contain itself, even as a proposed alternative.');
    }
    if (member?.collection === 'groups' && !['unknown', 'disputed'].includes(membership.group.status)) {
      containment.set(membership.memberRef, { parent: membership.group.value, path });
    }
  });

  // Only group containment must be acyclic. Runtime relationship cycles are legal.
  for (const start of containment.keys()) {
    const seen = new Set();
    let current = start;
    while (containment.has(current)) {
      if (seen.has(current)) {
        add('membership/cycle', containment.get(start).path, 'Asserted group containment contains a cycle.');
        break;
      }
      seen.add(current);
      current = containment.get(current).parent;
    }
  }

  model.notes.forEach((note, index) => {
    note.subjectRefs.forEach((id, subjectIndex) => reference(id, ['entities', 'groups', 'memberships', 'relationships'], `/notes/${index}/subjectRefs/${subjectIndex}`));
  });

  if (['0.3-draft', '0.4-draft'].includes(model.schemaVersion)) {
    if (entries.has(model.id)) add('identity/duplicate', '/id', 'The graph ID must differ from every record ID.');
    diagnostics.push(...graphDiagnostics(model), ...documentDiagnostics(model));
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics,
    summary: {
      entities: model.entities.length,
      relationships: model.relationships.length,
      groups: model.groups.length,
      unknown: unresolved.filter((item) => item.status === 'unknown').length,
      disputed: unresolved.filter((item) => item.status === 'disputed').length,
      ...(model.graphs ? { graphs: model.graphs.length } : {}),
      ...(model.documents ? { documents: model.documents.length } : {}),
    },
    unresolved,
    qualifications,
    limits: 'Checks structure and internal consistency only. Does not verify evidence, completeness, or real-world truth. Does not generate or check JSON 2.',
  };
}
