#!/usr/bin/env node
/**
 * create-biagiojs — scaffolding per biagiojs.
 *   npx create-biagiojs mio-sito
 *   npx create-biagiojs mio-sito --template blog|landing|docs|shop
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { create } from 'biagiojs/scaffold';

const args = process.argv.slice(2);
const tplIdx = args.indexOf('--template');
const template = tplIdx >= 0 ? args[tplIdx + 1] : 'default';
const dir = args.find((a, i) => !a.startsWith('--') && i !== tplIdx + 1);

if (!dir) {
  console.log('Uso: npx create-biagiojs <nome-cartella> [--template blog|landing|docs|shop]');
  process.exit(1);
}
const root = resolve(dir);
if (existsSync(join(root, 'package.json'))) {
  console.error(`✖ ${dir}/package.json esiste già`);
  process.exit(1);
}

await create(dir, { template });
