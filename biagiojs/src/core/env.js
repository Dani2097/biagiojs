/**
 * biagiojs — caricamento variabili d'ambiente per `biagio build`.
 * Compatibile con .env / .env.production e alias VITE_PUBLIC_* → PUBLIC_*.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

function applyEnv(entries) {
  for (const [key, val] of Object.entries(entries)) {
    if (process.env[key] === undefined) process.env[key] = val;
  }
  // Secondo passaggio: alias VITE_PUBLIC_* → PUBLIC_* (VITE_PUBLIC_API_URL → PUBLIC_API_URL)
  for (const [key, val] of Object.entries(entries)) {
    if (key.startsWith('VITE_PUBLIC_')) {
      const pub = key.slice('VITE_'.length);
      if (process.env[pub] === undefined) process.env[pub] = val;
    }
  }
}

function readEnvFiles(root, mode) {
  const files = ['.env', `.env.${mode}`, '.env.local', `.env.${mode}.local`];
  const merged = {};
  for (const f of files) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    Object.assign(merged, parseEnvFile(p));
  }
  return merged;
}

/** Carica .env nel processo. Preferisce loadEnv di Vite se disponibile, merge con parser nativo. */
export async function loadEnv(root, mode = 'production') {
  let merged = readEnvFiles(root, mode);
  try {
    const vite = await import('vite');
    Object.assign(merged, vite.loadEnv(mode, root, ''));
  } catch { /* vite assente: parser nativo basta */ }
  applyEnv(merged);
  return merged;
}

/** Errore esplicito se una variabile richiesta manca (es. credenziali SSG). */
export function requireEnv(name, { context = 'build' } = {}) {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `[biagio] Variabile d'ambiente mancante: ${name} (richiesta per ${context}). ` +
      `Aggiungila in .env o nelle variabili CI. Prefissi supportati: PUBLIC_* e VITE_PUBLIC_*.`
    );
  }
  return val;
}
