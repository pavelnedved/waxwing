import { validateLayout } from '../layout/validate.mjs';
import { fail } from '../shared/model.mjs';

export function assertLayout(layout) {
  const result = validateLayout(layout);
  if (!result.ok) fail('JSON 2 failed validation.', result.diagnostics);
}

export function recoverModel(layout) {
  assertLayout(layout);
  return structuredClone(layout.model);
}

export function extractLayout(artifact) {
  if (typeof artifact !== 'string') { assertLayout(artifact); return structuredClone(artifact); }
  const trimmed = artifact.trim();
  if (trimmed.startsWith('{')) {
    const layout = JSON.parse(trimmed);
    assertLayout(layout);
    return layout;
  }
  const matches = [...artifact.matchAll(/<metadata\s+id="waxwing-source"\s+data-encoding="base64">([A-Za-z0-9+/=\s]+)<\/metadata>/g)];
  if (matches.length !== 1) fail('Expected exactly one embedded Waxwing source payload.');
  const layout = JSON.parse(Buffer.from(matches[0][1], 'base64').toString('utf8'));
  assertLayout(layout);
  return layout;
}

export function recoverArtifact(artifact) {
  return recoverModel(extractLayout(artifact));
}
