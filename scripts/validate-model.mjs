#!/usr/bin/env node
import fs from 'node:fs';
import { validateModel } from '../lib/validate-model.mjs';

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: npm run validate -- <model.json>');
  process.exitCode = 2;
} else {
  try {
    const model = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const result = validateModel(model);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.log(JSON.stringify({ ok: false, diagnostics: [{ code: 'input/unreadable', path: args[0], message: error.message }] }, null, 2));
    process.exitCode = 2;
  }
}
