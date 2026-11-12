// Copies docs/ADMIN-MANUAL.md into the web app so the console's Help page shows the current guide.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../../docs/ADMIN-MANUAL.md');
const target = resolve(here, '../src/content/console-guide.ts');

if (!existsSync(source)) {
  console.log('[sync-guide] docs/ADMIN-MANUAL.md not found; keeping the existing copy');
  process.exit(0);
}
const md = readFileSync(source, 'utf8');
const out = `// Generated from docs/ADMIN-MANUAL.md by scripts/sync-guide.mjs. Edit the Markdown file, not this one.\nexport const CONSOLE_GUIDE = ${JSON.stringify(md)};\n`;
if (!existsSync(target) || readFileSync(target, 'utf8') !== out) writeFileSync(target, out);
console.log('[sync-guide] console guide updated');
