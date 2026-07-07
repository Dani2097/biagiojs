/**
 * biagiojs — caricamento biagio.config.js con default unificati.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseSubsetConfig } from './font-subset.js';
import { parseFontInject } from './fonts.js';

export const DEFAULT_IMAGE_WIDTHS = [480, 960, 1440];

function parseFontInjectConfig(fonts = {}) {
  const mode = parseFontInject(fonts.inject);
  return mode;
}

export async function loadConfig(root) {
  const configPath = join(root, 'biagio.config.js');
  const raw = existsSync(configPath)
    ? (await import(pathToFileURL(configPath).href + '?t=' + Date.now())).default
    : {};

  const site = raw.site || { name: 'biagiojs Site', baseUrl: 'https://example.com' };
  const images = {
    widths: site.images?.widths || DEFAULT_IMAGE_WIDTHS,
    bySlug: site.images?.bySlug || {},
    profiles: site.images?.profiles || {},
    quality: site.images?.quality ?? 75,
    qualityBySlug: site.images?.qualityBySlug || {},
    allowSmallerSources: site.images?.allowSmallerSources !== false,
    respectSourceMax: site.images?.respectSourceMax !== false,
    dryRun: site.images?.dryRun === true,
    avif: {
      effort: site.images?.avif?.effort ?? 4,
      chromaSubsampling: site.images?.avif?.chromaSubsampling ?? '4:2:0',
      ...site.images?.avif,
    },
    remote: {
      allowedDomains: site.images?.remote?.allowedDomains || [],
      allowLocalhost: site.images?.remote?.allowLocalhost === true,
      sources: site.images?.remote?.sources || [],
    },
  };
  const optimize = {
    purge: site.optimize?.purge !== false,
    minify: site.optimize?.minify !== false,
    scripts: site.optimize?.scripts !== false,
  };
  const subset = parseSubsetConfig(site.fonts?.subset);
  const injectMode = parseFontInjectConfig(site.fonts);
  const fonts = {
    inject: injectMode,
    preload: site.fonts?.preload ?? 'critical',
    preloadCritical: site.fonts?.preloadCritical || [],
    cssPath: site.fonts?.cssPath || '/fonts/google.css',
    allowedDomains: site.fonts?.allowedDomains || ['fonts.googleapis.com', 'fonts.gstatic.com'],
    google: site.fonts?.google || [],
    preloadFiles: site.fonts?.preloadFiles || [],
    files: site.fonts?.files || [],
    inlineCss: site.fonts?.inlineCss || null,
    subset,
  };
  const manifestPath = join(root, 'fonts', '.biagio-manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (m.preloadFiles?.length) fonts.preloadFiles = m.preloadFiles;
      if (m.inlineCss) fonts.inlineCss = m.inlineCss;
      if (m.files?.length) fonts.files = m.files;
      if (m.cssPath) fonts.cssPath = m.cssPath;
    } catch { /* manifest corrotto */ }
  }

  const cache = site.cache ?? null;
  const sitemap = site.sitemap || 'sitemap.xml';

  return {
    ...raw,
    site: { ...site, images, optimize, fonts, cache, sitemap },
    images,
    fonts,
    optimize,
    cache,
    hooks: raw.hooks || {},
  };
}
