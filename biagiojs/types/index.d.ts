/** biagiojs — tipi pubblici per config e graph API. */

export interface BiagioSiteConfig {
  name?: string;
  baseUrl?: string;
  description?: string;
  locales?: string[];
  defaultLocale?: string;
  sitemap?: string;
  deploy?: 'cloudflare' | 'vercel' | 'netlify' | { platform: string };
  images?: {
    widths?: number[];
    bySlug?: Record<string, number[]>;
    profiles?: Record<string, { widths?: number[]; sizes?: string }>;
    quality?: number;
    qualityBySlug?: Record<string, number>;
    allowSmallerSources?: boolean;
    respectSourceMax?: boolean;
    dryRun?: boolean;
    avif?: { effort?: number; chromaSubsampling?: string };
    remote?: {
      allowedDomains?: string[];
      allowLocalhost?: boolean;
      sources?: Array<{ url: string; slug: string }>;
    };
  };
  optimize?: { purge?: boolean; minify?: boolean; scripts?: boolean };
  fonts?: {
    inject?: boolean | 'critical' | 'all';
    preload?: string;
    preloadCritical?: string[];
    cssPath?: string;
    allowedDomains?: string[];
    google?: string[];
    preloadFiles?: string[];
    files?: string[];
    inlineCss?: string | null;
    subset?: { preset?: string | null; scan?: boolean; extra?: string; minSaving?: number };
  };
  cache?: boolean | Record<string, unknown>;
  consent?: {
    mode?: 'native' | 'cookiebot' | 'iubenda';
    categories?: string[];
    policyUrl?: string;
  };
}

export interface BiagioConfig {
  site?: BiagioSiteConfig;
  hooks?: Record<string, (...args: unknown[]) => unknown>;
}

export interface PerfNodeOptions {
  cpuCost?: number;
  memoryCost?: number;
  networkCost?: number;
  seoWeight?: number;
  conversionWeight?: number;
  interactionProbability?: number;
  render?: () => string;
  hydrate?: (el: HTMLElement) => void;
  clientModule?: string;
  hydrateMode?: 'inline' | 'eager' | 'visible' | 'idle' | 'never';
  domOrder?: number;
}

export class PerfNode {
  id: string;
  cpuCost: number;
  memoryCost: number;
  networkCost: number;
  seoWeight: number;
  conversionWeight: number;
  interactionProbability: number;
  businessValue: number;
  hydrate?: (el: HTMLElement) => void;
  clientModule?: string;
  hydrateMode?: string;
  domOrder: number;
  constructor(id: string, opts?: PerfNodeOptions);
  render(): string;
}

export class PerformanceGraph {
  nodes: Map<string, PerfNode>;
  add(node: PerfNode): this;
  get(id: string): PerfNode | undefined;
  orderedNodes(scoreFn?: (n: PerfNode) => number): PerfNode[];
}

export function loadConfig(root: string): Promise<BiagioConfig & { images: BiagioSiteConfig['images']; fonts: BiagioSiteConfig['fonts']; optimize: BiagioSiteConfig['optimize']; cache: BiagioSiteConfig['cache']; deploy: string | null }>;

export function runDoctor(root: string): Promise<{ ok: boolean; errors: string[]; warnings: string[] }>;

export function analyzeDist(root: string): {
  pages: Array<{ path: string; htmlKb: number; scripts: number; islands: number; hydration: string }>;
  totals: { pages: number; htmlKb: number; imgKb: number; islandsKb: number; fontsKb: number };
  reportPath: string;
};

export function createBiagioServer(projectDir: string, opts?: { userIdFromRequest?: (req: import('node:http').IncomingMessage) => string; compress?: boolean }): import('node:http').Server;
