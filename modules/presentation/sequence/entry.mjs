import { assertedEntry, entryStatus } from '../../knowledge/sequence/entry.mjs';

export const entryCue = (model, itemRef) => assertedEntry(model)?.value.itemRef === itemRef ? [`Workflow entry [${model.entry.point.status}]`] : [];
export const placementCaption = (model) => assertedEntry(model)
  ? `Entry: ${entryStatus(model)} · Entry participant at left; other columns do not imply flow`
  : `Entry: ${entryStatus(model)} · Columns do not identify a start or imply flow`;
