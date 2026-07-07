/**
 * CVW-First §7 — "AI-assisted Compiler" (build-time optimizer).
 * At every build it ingests field data reports and recalibrates the graph
 * WITHOUT developer intervention:
 *
 *   - analytics.json  → observed click-through per component
 *                       ⇒ replaces declared interactionProbability (learned > declared)
 *   - crux.json       → field LCP/INP/CLS percentiles
 *                       ⇒ adapts hydration thresholds (slow devices ⇒ hydrate less)
 *   - heatmap.json    → attention share per component
 *                       ⇒ boosts/demotes conversionWeight (bounded ±0.2)
 *   - searchconsole.json → queries/impressions per component content
 *                       ⇒ boosts seoWeight of matched components
 *
 * Deterministic and inspectable: returns a decision log for the build output.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export function loadReports(dir) {
  const load = f => {
    const p = join(dir, f);
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
  };
  return {
    analytics: load('analytics.json'),
    crux: load('crux.json'),
    heatmap: load('heatmap.json'),
    searchconsole: load('searchconsole.json'),
  };
}

export function optimize(graph, reports) {
  const log = [];

  // 1. Learned interaction probability (field data beats declarations)
  if (reports.analytics?.componentClicks) {
    const clicks = reports.analytics.componentClicks;   // {id: ctr 0..1}
    for (const [id, ctr] of Object.entries(clicks)) {
      const n = graph.get(id);
      if (!n) continue;
      if (Math.abs(n.interactionProbability - ctr) > 0.02) {
        log.push(`interactionProbability ${id}: ${n.interactionProbability} → ${ctr} (analytics)`);
        n.interactionProbability = clamp(ctr);
      }
    }
  }

  // 2. Heatmap attention → conversionWeight nudges (bounded, never inverts intent)
  if (reports.heatmap?.attentionShare) {
    for (const [id, share] of Object.entries(reports.heatmap.attentionShare)) {
      const n = graph.get(id);
      if (!n) continue;
      const nudge = clamp((share - 0.1) * 0.5, -0.2, 0.2);  // >10% attention boosts
      const next = clamp(n.conversionWeight + nudge);
      if (Math.abs(next - n.conversionWeight) > 0.01) {
        log.push(`conversionWeight ${id}: ${n.conversionWeight.toFixed(2)} → ${next.toFixed(2)} (heatmap ${Math.round(share * 100)}%)`);
        n.conversionWeight = next;
      }
    }
  }

  // 3. Search Console → seoWeight boost for components matching top queries
  if (reports.searchconsole?.topComponents) {
    for (const id of reports.searchconsole.topComponents) {
      const n = graph.get(id);
      if (n && n.seoWeight < 0.9) {
        log.push(`seoWeight ${id}: ${n.seoWeight} → ${clamp(n.seoWeight + 0.15).toFixed(2)} (search console)`);
        n.seoWeight = clamp(n.seoWeight + 0.15);
      }
    }
  }

  // 4. CrUX field vitals → hydration budget
  //    Slow INP/LCP in the field ⇒ raise thresholds (ship/execute less JS).
  let thresholds = { eagerThreshold: 0.3, lazyThreshold: 0.05 };
  if (reports.crux?.p75) {
    const { inp = 100, lcp = 2000 } = reports.crux.p75;
    if (inp > 200 || lcp > 2500) {
      thresholds = { eagerThreshold: 0.45, lazyThreshold: 0.12 };
      log.push(`hydration thresholds raised (CrUX p75: INP ${inp}ms, LCP ${lcp}ms) → eager≥0.45, lazy≥0.12`);
    } else if (inp < 100 && lcp < 1500) {
      thresholds = { eagerThreshold: 0.2, lazyThreshold: 0.03 };
      log.push(`hydration thresholds relaxed (fast field data) → eager≥0.2, lazy≥0.03`);
    }
  }

  return { thresholds, log };
}
