/**
 * Local preview with .env loaded — `biagio preview` alone does not read .env,
 * so ISR/SSR pages (home, account) would render as unconfigured.
 */
import { loadEnv } from 'biagiojs/env';
import { resolve } from 'node:path';

const root = resolve('.');
await loadEnv(root, 'production');
const { createBiagioServer } = await import('biagiojs/adapters/node');
const port = +(process.env.PORT || 3000);
createBiagioServer(root, { compress: true }).listen(port, () =>
  console.log(`preview (env) → http://localhost:${port}`));
