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

export function knowledgeText(claim) {
  if (!claim) return 'Unspecified';
  if (claim.status === 'unknown') return 'Unknown';
  if (claim.status === 'disputed') return 'Disputed';
  return String(claim.value);
}

export function existenceText(claim) {
  if (claim.status === 'unknown') return 'Existence unknown';
  if (claim.status === 'disputed') return 'Existence disputed';
  return `${claim.status} · ${claim.value ? 'present' : 'absent'}`;
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

export function alerts(model, record) {
  const tally = counts([record, ...related(model, record.id)]);
  return Object.entries(tally).filter(([, count]) => count > 0).map(([status, count]) => `${count} ${status}`);
}

// Conservative monospace widths. These are drawing metrics, not system facts.
export const units = (text) => [...text].reduce((sum, char) => sum + (/[^\u0000-\u00ff]/u.test(char) ? 2 : 1), 0);
export function wrap(text, limit = 30) {
  const result = [];
  let line = '';
  for (const char of text) {
    if (char === '\n') {
      result.push(line);
      line = '';
      continue;
    }
    if (units(line + char) > limit) {
      const space = line.lastIndexOf(' ');
      if (space > 0) {
        result.push(line.slice(0, space));
        line = line.slice(space + 1);
      } else { result.push(line); line = ''; }
    }
    line += char;
  }
  result.push(line);
  return result;
}

export function edgeLines(edge) {
  const lines = wrap(edge.label, 24);
  if (!exists(edge.existence)) lines.push(existenceText(edge.existence));
  if (edge.condition && !isEstablished(edge.condition)) lines.push(`Condition ${edge.condition.status}`);
  return lines;
}

export function frameMemberships(model, perspectiveRef) {
  if (!perspectiveRef) return [];
  const groups = new Map(model.groups.map((group) => [group.id, group]));
  return model.memberships.filter((membership) =>
    membership.perspectiveRef === perspectiveRef && isEstablished(membership.group) &&
    isEstablished(groups.get(membership.group.value)?.meaning));
}

export function visibleGroups(model, perspectiveRef) {
  const memberships = frameMemberships(model, perspectiveRef);
  const result = new Set();
  let frontier = new Set(model.entities.map((entity) => entity.id));
  while (frontier.size) {
    const next = new Set();
    for (const membership of memberships) {
      if (frontier.has(membership.memberRef) && !result.has(membership.group.value)) {
        result.add(membership.group.value);
        next.add(membership.group.value);
      }
    }
    frontier = next;
  }
  return result;
}
