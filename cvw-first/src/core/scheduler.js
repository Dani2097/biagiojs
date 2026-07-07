/**
 * CVW-First — Business-Aware Scheduler
 * Computes rendering order and hydration priority from the Performance Graph.
 *
 * Rendering priority  = businessValue / renderCost      (value per unit of work)
 * Hydration priority  = interactionProbability × businessValue × cpuAvailability
 * Network priority    = businessValue / transferredKB   (value per KB)
 */

const norm = x => Math.max(x, 0.01);

export function renderScore(node) {
  const cost = norm(node.cpuCost + 0.5 * node.memoryCost);
  return node.businessValue / cost;
}

export function hydrationPriority(node, cpuAvailability = 1) {
  return node.interactionProbability * node.businessValue * cpuAvailability;
}

export function networkScore(node) {
  return node.businessValue / norm(node.networkCost);
}

/** SSR render order: dependency-safe, business-value-per-cost descending. */
export function renderOrder(graph) {
  return graph.orderedNodes(renderScore);
}

/**
 * Hydration plan: which islands hydrate, and when.
 *  - priority >= eagerThreshold  → hydrate immediately after paint
 *  - priority >= lazyThreshold   → hydrate on idle / on visibility
 *  - below                       → stay static HTML (zero JS shipped)
 */
export function hydrationPlan(graph, { eagerThreshold = 0.3, lazyThreshold = 0.05, cpuAvailability = 1 } = {}) {
  const plan = { eager: [], lazy: [], static: [] };
  for (const node of graph.nodes.values()) {
    const p = hydrationPriority(node, cpuAvailability);
    if (!node.hydrate && !node.clientModule) { plan.static.push({ node, priority: p }); continue; }
    // override esplicito dello sviluppatore: vince sempre sullo scheduler
    switch (node.hydrateMode) {
      case 'never': plan.static.push({ node, priority: p }); continue;
      case 'inline':
      case 'eager': plan.eager.push({ node, priority: p }); continue;
      case 'visible':
      case 'idle': plan.lazy.push({ node, priority: p }); continue;
    }
    if (p >= eagerThreshold) plan.eager.push({ node, priority: p });
    else if (p >= lazyThreshold) plan.lazy.push({ node, priority: p });
    else plan.static.push({ node, priority: p });
  }
  for (const k of Object.keys(plan)) plan[k].sort((a, b) => b.priority - a.priority);
  return plan;
}

/** Resource loading order: value per transferred KB. */
export function networkSchedule(assets) {
  // assets: [{url, kb, businessValue}]
  return [...assets].sort((a, b) => (b.businessValue / norm(b.kb)) - (a.businessValue / norm(a.kb)));
}
