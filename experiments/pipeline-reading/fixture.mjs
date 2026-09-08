// A fully synthetic architecture. These helpers expand every claim explicitly
// in the generated JSON 1; there is no runtime evidence inheritance.
const established = (value, explanation) => ({
  status: 'established', value,
  basis: { sourceRefs: ['fixture-spec'], explanation },
});
const definitions = [
  ['upload-api', 'Upload API', 'service', 'Accepts an image and publishes its upload job.'],
  ['upload-queue', 'Upload Queue', 'queue', 'Carries upload jobs to the resize worker.'],
  ['resize-worker', 'Resize Worker', 'service', 'Consumes an upload job, resizes its image, and publishes a resized-image job.'],
  ['resized-queue', 'Resized Queue', 'queue', 'Carries resized-image jobs to the index worker.'],
  ['index-worker', 'Index Worker', 'service', 'Consumes a resized-image job and writes the resulting index record.'],
  ['index-db', 'Index DB', 'datastore', 'Stores the completed image index records.'],
];
const connections = [
  ['publish-upload', 'upload-api', 'upload-queue', 'publishes', 'Publishes upload jobs'],
  ['consume-upload', 'resize-worker', 'upload-queue', 'consumes', 'Consumes upload jobs'],
  ['publish-resized', 'resize-worker', 'resized-queue', 'publishes', 'Publishes resized jobs'],
  ['consume-resized', 'index-worker', 'resized-queue', 'consumes', 'Consumes resized jobs'],
  ['write-index', 'index-worker', 'index-db', 'writes', 'Writes index records'],
];

// Evaluation oracle, authored before running either layout. It transcribes the
// established successful-processing note below; this is not a new public schema.
export const sequence = definitions.map(([id]) => id);
export const model = {
  schemaVersion: '0.2-draft', id: 'image-pipeline', title: 'Image Processing Pipeline',
  scope: {
    timeframe: 'current', environment: 'fictional production', snapshot: 'pipeline-fixture-1', coverage: 'partial',
    question: 'Follow one successfully processed image from upload to its index record.',
    includes: ['The six deployed components on the successful processing path', 'Their five operation relationships'],
    excludes: ['Retries and failure paths', 'Worker replicas and broker internals', 'Ownership and deployment boundaries'],
    abstraction: 'Deployed services, queues, and one datastore; each component represents all of its instances.',
  },
  sources: [{ id: 'fixture-spec', kind: 'fixture', locator: '../evidence.md', description: 'Stipulated current behavior in this fully synthetic experiment.' }],
  perspectives: [], groups: [], memberships: [],
  entities: definitions.map(([id, label, category, responsibility]) => ({
    id, label,
    existence: established(true, `${label} is deployed in pipeline-fixture-1.`),
    category: established(category, `The fixture explicitly classifies ${label} as ${category}.`),
    abstraction: {
      represents: established(responsibility, 'This responsibility is stipulated in the fixture specification.'),
      omits: ['Internal implementation and replica count'], reason: 'Keep the successful processing path at component level.',
    },
  })),
  relationships: connections.map(([id, from, to, kind, label]) => ({
    id, from, to, kind, label,
    existence: established(true, `The fixture explicitly establishes that ${from} ${kind} ${to}.`),
  })),
  notes: [{
    id: 'successful-processing', subjectRefs: [...sequence, ...connections.map(([id]) => id)], topic: 'behavior',
    statement: 'What sequence does one successfully processed image follow?',
    answer: established(
      'Upload API publishes the image job to Upload Queue. Resize Worker consumes that job, resizes its image, then publishes its result to Resized Queue. Index Worker consumes that result and writes the image index record to Index DB.',
      'The fixture stipulates this per-image causal sequence explicitly. It is not inferred from dependency arrows. Failure and retry behavior is outside this partial model.',
    ),
  }],
};
