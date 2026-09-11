import { existenceText, units } from '../shared/model.mjs';

// Short previews come only from authored claims. Full text stays in the
// inspector and embedded source; qualification always precedes an excerpt.
export function previewText(text, limit) {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (units(normalized) <= limit) return normalized;
  let result = '';
  for (const {segment} of new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(normalized)) {
    if (units(result + segment) > limit - units('…')) break;
    result += segment;
  }
  return `${result.trimEnd()}…`;
}

export function componentPresentation(entity) {
  const category = entity.category;
  const hasRole = ['established', 'reported', 'inferred'].includes(category.status);
  const role = hasRole ? category.value : 'unspecified';
  const roleLabel = hasRole
    ? `${role[0].toUpperCase()}${role.slice(1)}${category.status === 'established' ? '' : ` · ${category.status}`}`
    : `Category ${category.status}`;
  const meaning = entity.abstraction.represents;
  const summary = ['unknown', 'disputed'].includes(meaning.status)
    ? `Meaning ${meaning.status}`
    : `${meaning.status === 'established' ? '' : `${meaning.status}: `}${meaning.value}`;
  const existence = entity.existence.status === 'established' && entity.existence.value === true
    ? '' : existenceText(entity.existence);
  return { role, roleLabel, summary, existence };
}
