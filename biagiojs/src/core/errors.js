/**
 * Errori strutturati per overlay dev e messaggi CLI.
 */
export class BiagioError extends Error {
  /** @param {string} message @param {{ file?: string, line?: number, column?: number, cause?: Error }} [loc] */
  constructor(message, { file, line, column, cause } = {}) {
    super(message);
    this.name = 'BiagioError';
    this.file = file;
    this.line = line;
    this.column = column;
    if (cause) this.cause = cause;
  }

  get location() {
    if (!this.file) return null;
    return this.line != null ? `${this.file}:${this.line}${this.column != null ? `:${this.column}` : ''}` : this.file;
  }
}

/** Converte Error generici `[biagio] Errore in pages/foo.biagio:\n  msg` in BiagioError. */
export function normalizeBiagioError(err, fallbackFile) {
  if (err instanceof BiagioError) return err;
  const msg = err.message || String(err);
  const pageMatch = msg.match(/pages\/([^\s:]+)/);
  const compilerMatch = msg.match(/\[biagio compiler\]\s*([^:]+):(\d+)?/);
  const file = compilerMatch?.[1] || (pageMatch ? `pages/${pageMatch[1]}` : fallbackFile);
  const line = compilerMatch?.[2] ? Number(compilerMatch[2]) : undefined;
  return new BiagioError(msg.replace(/^\[biagio[^\]]*\]\s*/i, ''), { file, line, cause: err });
}

/** HTML overlay dev con file:riga evidenziato. */
export function formatErrorOverlay(err) {
  const e = normalizeBiagioError(err);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const loc = e.location
    ? `<div style="color:#f5c518;font-size:13px;margin-bottom:12px">📍 <b>${esc(e.location)}</b></div>`
    : '';
  return { error: e, html: loc + `<pre style="background:#1e1e2e;border:1px solid #3a3a52;border-radius:10px;padding:20px;white-space:pre-wrap;color:#ffb3b3;margin:0">${esc(e.message)}</pre>` };
}
