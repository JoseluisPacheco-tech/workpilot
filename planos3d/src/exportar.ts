import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { detectarCuartos } from './cuartos';
import { construirModelo, liberar } from './escena';
import { Plano } from './modelo';

export type Formato = 'glb' | 'obj' | 'stl';

export function descargar(contenido: BlobPart, nombre: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarModelo(plano: Plano, formato: Formato) {
  const modelo = construirModelo(plano, detectarCuartos(plano.muros));
  try {
    if (formato === 'glb') {
      const datos = (await new GLTFExporter().parseAsync(modelo, { binary: true })) as ArrayBuffer;
      descargar(datos, 'modelo.glb', 'model/gltf-binary');
    } else if (formato === 'obj') {
      descargar(new OBJExporter().parse(modelo), 'modelo.obj', 'text/plain');
    } else {
      const datos = new STLExporter().parse(modelo, { binary: true });
      descargar(datos as unknown as BlobPart, 'modelo.stl', 'model/stl');
    }
  } finally {
    liberar(modelo);
  }
}

export function guardarProyecto(plano: Plano) {
  descargar(JSON.stringify({ version: 1, plano }), 'proyecto.json', 'application/json');
}
