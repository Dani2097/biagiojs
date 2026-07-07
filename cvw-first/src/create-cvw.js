#!/usr/bin/env node
/** `npx create-cvw mio-sito` — scaffolding standalone. */
import { create } from './cli.js';
const dir = process.argv[2];
if (!dir) { console.log('Uso: npx create-cvw <nome-cartella>'); process.exit(1); }
create(dir);
console.log(`\nProssimi passi:\n  cd ${dir}\n  npm install\n  npm run dev`);
