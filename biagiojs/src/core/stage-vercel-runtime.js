/**
 * biagiojs — stage pages/config under api/_runtime for Vercel serverless.
 *
 * Vercel `includeFiles` on project-root globs does not reliably bundle sources
 * loaded via dynamic import() in renderRequest(). Copying into api/_runtime
 * at build time keeps them next to the function (includeFiles: api/_runtime/**).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_VERCEL_STAGE_ENTRIES = [
  'pages',
  'biagio.config.js',
  'content.config.js',
  'islands',
  'lib',
  'theme.js',
];

/**
 * @param {string} root — project root
 * @param {{ entries?: string[], log?: (msg: string) => void }} [opts]
 * @returns {string} api/_runtime path
 */
export function stageVercelRuntime(root, { entries = DEFAULT_VERCEL_STAGE_ENTRIES, log } = {}) {
  const dest = join(root, 'api', '_runtime');
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  let copied = 0;
  for (const entry of entries) {
    const src = join(root, entry);
    if (!existsSync(src)) continue;
    cpSync(src, join(dest, entry), { recursive: true });
    copied++;
  }

  if (!existsSync(join(dest, 'pages'))) {
    throw new Error(
      'biagiojs: api/_runtime staging failed — pages/ not found. ' +
      'Ensure pages/*.page.js exist before building with site.deploy: "vercel".',
    );
  }

  log?.(`  deploy: Vercel SSR runtime staged (${copied} entries) → api/_runtime/`);
  return dest;
}
