/**
 * CVW-First §11 — Integrated Experimentation.
 * Variants are selected SERVER-SIDE, deterministically per user, and rendered
 * as plain HTML — zero client-side flicker, zero CLS, zero blocking JS.
 *
 * Usage:
 *   const ab = new ExperimentEngine({ userId });
 *   ab.define('checkout_v2', ['control', 'variant_b'], { weights: [0.5, 0.5] });
 *   node.render = () => ab.pick('checkout_v2', {
 *     control:   () => '<button>Compra</button>',
 *     variant_b: () => '<button>Compra ora — spedizione gratis</button>',
 *   });
 */

// FNV-1a — stable, dependency-free hash for deterministic assignment
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) / 0xffffffff;
}

export class ExperimentEngine {
  constructor({ userId = 'anonymous' } = {}) {
    this.userId = userId;
    this.defs = new Map();
    this.assignments = {};   // exposed for analytics beacons
  }

  define(name, variants, { weights } = {}) {
    const w = weights || variants.map(() => 1 / variants.length);
    this.defs.set(name, { variants, weights: w });
    return this;
  }

  /** Deterministic variant for this user. */
  assign(name) {
    if (this.assignments[name]) return this.assignments[name];
    const def = this.defs.get(name);
    if (!def) throw new Error(`Experiment "${name}" not defined`);
    const r = fnv1a(this.userId + '::' + name);
    let acc = 0, chosen = def.variants[def.variants.length - 1];
    for (let i = 0; i < def.variants.length; i++) {
      acc += def.weights[i];
      if (r < acc) { chosen = def.variants[i]; break; }
    }
    this.assignments[name] = chosen;
    return chosen;
  }

  /** Render the assigned variant. renderers: {variantName: () => html} */
  pick(name, renderers) {
    const v = this.assign(name);
    const fn = renderers[v];
    if (!fn) throw new Error(`No renderer for variant "${v}" of "${name}"`);
    return `<span data-cvw-exp="${name}" data-cvw-variant="${v}">${fn()}</span>`;
  }

  /** Inline script exposing assignments to analytics (non-blocking). */
  beacon() {
    return `<script>window.__CVW_EXPERIMENTS__=${JSON.stringify(this.assignments)};</scr` + `ipt>`;
  }
}
