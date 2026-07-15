/**
 * biagiojs — preset deploy Cloudflare / Vercel / Netlify.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['vercel.json', 'netlify.toml', 'wrangler.toml']);

function writeIfAbsent(root, name, content, log) {
  const p = join(root, name);
  if (existsSync(p)) {
    log?.(`  deploy: ${name} già presente — non sovrascritto`);
    return false;
  }
  const dir = name.includes('/') ? join(root, name.split('/').slice(0, -1).join('/')) : root;
  mkdirSync(dir, { recursive: true });
  writeFileSync(p, content);
  log?.(`  deploy: creato ${name}`);
  return true;
}

/**
 * @param {'cloudflare'|'vercel'|'netlify'|{ platform: string }} deploy
 */
export function generateDeployPreset(root, deploy, { log } = {}) {
  const platform = typeof deploy === 'string' ? deploy : deploy?.platform;
  if (!platform) return [];

  const created = [];

  if (platform === 'vercel') {
    if (writeIfAbsent(root, 'vercel.json', JSON.stringify({
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      trailingSlash: true,
      functions: {
        'api/ssr.js': {
          includeFiles: 'api/_runtime/**',
        },
      },
      rewrites: [
        { source: '/', destination: '/api/ssr?__path=' },
        { source: '/:path((?!api/).+)', destination: '/api/ssr?__path=:path' },
      ],
    }, null, 2) + '\n', log)) created.push('vercel.json');
    if (writeIfAbsent(root, 'api/ssr.js', `import { createVercelHandler } from 'biagiojs/adapters/vercel';\n\nexport default createVercelHandler(import.meta.url);\n`, log)) created.push('api/ssr.js');
  }

  if (platform === 'cloudflare') {
    if (writeIfAbsent(root, 'wrangler.toml', `# biagiojs — Cloudflare Pages
name = "my-biagiojs-site"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"
`, log)) created.push('wrangler.toml');
    if (writeIfAbsent(root, 'functions/[[path]].js', `import { onRequest } from 'biagiojs/adapters/cloudflare';\nexport { onRequest };\n`, log)) created.push('functions/[[path]].js');
  }

  if (platform === 'netlify') {
    if (writeIfAbsent(root, 'netlify.toml', `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/ssr"
  status = 200
  force = false
`, log)) created.push('netlify.toml');
    if (writeIfAbsent(root, 'netlify/functions/ssr.mjs', `import { createHandler } from 'biagiojs/adapters/vercel';\nexport default createHandler();\n`, log)) created.push('netlify/functions/ssr.mjs');
  }

  return created;
}

export function parseDeploy(site = {}) {
  const d = site.deploy;
  if (!d) return null;
  if (typeof d === 'string') return d;
  return d.platform || null;
}
