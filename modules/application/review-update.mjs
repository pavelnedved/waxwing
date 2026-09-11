import { loadModel } from './load-model.mjs';
import { compareModelRecords } from '../knowledge/records/compare.mjs';

export function reviewUpdate(beforeFile, afterFile) {
  return compareModelRecords(loadModel(beforeFile).model, loadModel(afterFile).model);
}
