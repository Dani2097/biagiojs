# Benchmark — CVW-First vs baseline naive

Stessa pagina prodotto, due strategie. Baseline = tutto idratato, nessuna prioritizzazione (comportamento di un framework tradizionale senza islands tuning).

| Metrica | CVW-First | Naive |
|---|---|---|
| Isole idratate (eager+lazy) | **1+0** | 9+0 |
| JS di isole spedito (byte) | **501** | 848 |
| Peso HTML (KB) | **18.0** | 15.1 |
| Primo elemento conversion nel sorgente (%) | **35.5%** | 29.7% |
| Copertura SEO automatica (0-4) | **4** | 0 |

**JS di idratazione risparmiato: 41%** (il paper §13 ipotizza -70% di hydration work: sotto l'ipotesi su questa pagina).

Il "primo elemento conversion nel sorgente" è un proxy statico di CFP: più è basso, prima il contenuto che converte arriva sul wire in streaming.

Limiti: misura statica senza browser. Per numeri di campo (LCP/INP reali) servire le due pagine e usare `node src/cli.js pull-vitals <url>` o Lighthouse CI.
