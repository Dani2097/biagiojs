import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runDoctor, formatDoctorReport } from '../src/core/doctor.js';

function scaffold(dir, { withSharp = true, withImages = false } = {}) {
  mkdirSync(join(dir, 'pages'), { recursive: true });
  writeFileSync(join(dir, 'biagio.config.js'), `export default { site: { name: 'T', baseUrl: 'https://t.dev' } };`);
  writeFileSync(join(dir, 'pages', 'index.page.biagio'), '<page title="t" /><component id="x"><template>ok</template></component>');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    dependencies: { biagiojs: '^0.10.2' },
    devDependencies: withSharp ? { sharp: '^0.33.0' } : {},
  }));
  if (withImages) {
    mkdirSync(join(dir, 'images'), { recursive: true });
    writeFileSync(join(dir, 'images', 'hero.jpg'), 'fake');
  }
}

test('doctor: progetto valido → ok', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-doc-'));
  scaffold(dir);
  const r = await runDoctor(dir);
  assert.equal(r.ok, true);
  assert.match(formatDoctorReport(r), /tutto ok/);
});

test('doctor: images senza sharp → errore', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-doc-'));
  scaffold(dir, { withSharp: false, withImages: true });
  const r = await runDoctor(dir);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /sharp/);
});

test('doctor: baseUrl placeholder → warning', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-doc-'));
  scaffold(dir);
  writeFileSync(join(dir, 'biagio.config.js'), `export default { site: { name: 'T', baseUrl: 'https://example.com' } };`);
  const r = await runDoctor(dir);
  assert.ok(r.warnings.some(w => /baseUrl/.test(w)));
});
