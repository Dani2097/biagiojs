/**
 * CVW-First §7 — Connettore PageSpeed Insights / CrUX reale.
 * Con PSI_API_KEY (o senza, entro i rate limit) scarica field data reali
 * e li salva in reports/crux.json, chiudendo il feedback loop del paper.
 *
 *   node src/cli.js pull-vitals <url> [projectDir]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function pullVitals(url, reportsDir, { apiKey = process.env.PSI_API_KEY } = {}) {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  if (apiKey) endpoint.searchParams.set('key', apiKey);

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`PSI API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();

  const m = json.loadingExperience?.metrics || {};
  const p75 = {
    lcp: m.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    inp: m.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
    cls: (m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ?? null) !== null
      ? m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
  };
  const lighthouse = {
    performance: json.lighthouseResult?.categories?.performance?.score ?? null,
    lcp: json.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue ?? null,
    tbt: json.lighthouseResult?.audits?.['total-blocking-time']?.numericValue ?? null,
  };

  mkdirSync(reportsDir, { recursive: true });
  const out = { source: 'psi', url, fetchedAt: new Date().toISOString(), p75, lighthouse };
  writeFileSync(join(reportsDir, 'crux.json'), JSON.stringify(out, null, 2));
  return out;
}
