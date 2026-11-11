// Copia el lector de DWG (WebAssembly) a la carpeta publica de la app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const origen = path.join(raiz, 'node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm');
const destino = path.join(raiz, 'public/dwg/libredwg-web.wasm');
if (fs.existsSync(origen)) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origen, destino);
}
