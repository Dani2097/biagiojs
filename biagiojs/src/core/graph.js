/**
 * biagiojs — Performance Graph
 * Instead of a Virtual DOM tree, components become nodes in a graph
 * annotated with technical costs AND business weights.
 */

export class PerfNode {
  constructor(id, {
    cpuCost = 1,            // relative CPU units to render/hydrate
    memoryCost = 1,         // relative memory units
    networkCost = 0,        // KB of extra assets required
    seoWeight = 0,          // 0..1 — contribution to SEO-critical content
    conversionWeight = 0,   // 0..1 — contribution to conversion
    interactionProbability = 0, // 0..1 — likelihood the user interacts
    dependencies = [],      // ids of nodes that must render first
    render,                 // () => html string (SSR)
    hydrate,                // (el) => void (client, inline serializzata)
    clientModule,           // '/islands/x.js' → modulo client vero (bundlabile, React ok)
    clientProps,            // props serializzabili passate al modulo
    hydrateMode,            // override esplicito: 'inline'|'eager'|'visible'|'idle'|'never'
    consent,                // categoria GDPR: l'isola non si idrata senza consenso ('marketing'…)
  } = {}) {
    Object.assign(this, {
      id, cpuCost, memoryCost, networkCost, seoWeight, conversionWeight,
      interactionProbability, dependencies, render, hydrate, clientModule, clientProps, hydrateMode, consent,
    });
  }

  /** True se il nodo ha JS client (inline o modulo). */
  get interactive() { return Boolean(this.hydrate || this.clientModule); }

  /** Business value of the node (used by scheduler & hydration). */
  get businessValue() {
    // conversion dominates, SEO matters, interaction adds signal
    return 0.6 * this.conversionWeight
         + 0.25 * this.seoWeight
         + 0.15 * this.interactionProbability;
  }
}

export class PerformanceGraph {
  constructor() { this.nodes = new Map(); }

  add(node) { this.nodes.set(node.id, node); return this; }

  get(id) { return this.nodes.get(id); }

  /** Topological sort respecting dependencies, tie-broken by priority score. */
  orderedNodes(scoreFn) {
    const indeg = new Map();
    const dependents = new Map();
    for (const n of this.nodes.values()) {
      indeg.set(n.id, n.dependencies.length);
      for (const d of n.dependencies) {
        if (!dependents.has(d)) dependents.set(d, []);
        dependents.get(d).push(n.id);
      }
    }
    const ready = [...this.nodes.values()].filter(n => indeg.get(n.id) === 0);
    const out = [];
    while (ready.length) {
      ready.sort((a, b) => scoreFn(b) - scoreFn(a)); // highest score first
      const n = ready.shift();
      out.push(n);
      for (const depId of dependents.get(n.id) || []) {
        indeg.set(depId, indeg.get(depId) - 1);
        if (indeg.get(depId) === 0) ready.push(this.nodes.get(depId));
      }
    }
    if (out.length !== this.nodes.size) throw new Error('Cycle in Performance Graph');
    return out;
  }
}
