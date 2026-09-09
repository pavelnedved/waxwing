import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../modules/render/viewer.css', import.meta.url), 'utf8');

test('desktop inspector reserves exactly its width only while open', () => {
  const desktop = css.match(/@media\(min-width:901px\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(desktop);
  const reserved = desktop.match(/body:has\(#inspector:not\(\[hidden\]\)\)\s*\{\s*padding-right:([^;]+);/)?.[1];
  const width = desktop.match(/#inspector\s*\{\s*width:([^;]+);/)?.[1];
  assert.ok(reserved);
  assert.equal(reserved, width);
});

test('narrow inspector stays in document flow with bounded scrolling', () => {
  const narrow = css.match(/@media\(max-width:900px\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.match(narrow, /position:relative/);
  assert.match(narrow, /width:100%/);
  assert.match(narrow, /max-height:60vh/);
});
