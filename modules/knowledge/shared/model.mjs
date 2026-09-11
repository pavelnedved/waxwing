import { createHash } from 'node:crypto';

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const digest = (value) => createHash('sha256').update(canonical(value)).digest('hex');
export const isEstablished = (claim) => claim?.status === 'established';
export const exists = (claim) => isEstablished(claim) && claim.value === true;

export function fail(message, diagnostics = []) {
  const error = new Error(message);
  error.diagnostics = diagnostics;
  throw error;
}

export function counts(value) {
  const result = { unknown: 0, disputed: 0, reported: 0, inferred: 0 };
  function visit(item) {
    if (!item || typeof item !== 'object') return;
    if (Object.hasOwn(result, item.status)) result[item.status]++;
    Object.values(item).forEach(visit);
  }
  visit(value);
  return result;
}

export function related(model, ref) {
  return [
    ...model.memberships.filter((item) => item.memberRef === ref),
    ...model.notes.filter((item) => item.subjectRefs.includes(ref)),
  ];
}
