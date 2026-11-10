import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

const hayClave = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const cliente = hayClave ? new Anthropic() : null;

const Lectura = z.object({
  muros: z.array(
    z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(), grosor: z.number() }),
  ),
  huecos: z.array(
    z.object({ tipo: z.enum(['puerta', 'ventana']), x: z.number(), y: z.number(), ancho: z.number() }),
  ),
  escala: z
    .object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(), metros: z.number() })
    .nullable(),
  notas: z.string(),
});

const INSTRUCCIONES = `Eres un experto en lectura de planos arquitectonicos. Recibes la imagen de una planta y devuelves su geometria para levantarla en 3D.

Sistema de coordenadas: la imagen es cuadrada. Usa coordenadas de 0 a 1000 en ambos ejes, con el origen en la esquina superior izquierda, x hacia la derecha, y hacia abajo. Todas las longitudes (grosor, ancho) van en esas mismas unidades.

Muros:
- Cada muro es un segmento recto dado por su eje central (x1, y1) a (x2, y2) y su grosor.
- Un muro pasa de largo por sus puertas y ventanas: no lo cortes en los huecos.
- Los muros que se encuentran en una esquina o union deben compartir exactamente la misma coordenada en ese punto.
- Incluye muros exteriores e interiores. Ignora muebles, sanitarios, cotas, textos, ejes, achurados, escaleras y vegetacion.
- La mayoria de los muros son horizontales o verticales: en esos casos repite exactamente la misma coordenada en ambos extremos.

Huecos:
- Para cada puerta o ventana da su tipo, el punto central (x, y) sobre el eje del muro y su ancho a lo largo del muro.
- Una puerta se reconoce por el arco de abatimiento o el vano libre; una ventana por las lineas finas paralelas dentro del muro.

Escala:
- Si hay una cota legible, o una escala grafica, da los dos extremos de esa medida (x1, y1, x2, y2) y su valor real en metros. Elige la cota mas larga que leas con seguridad.
- Si no hay ninguna medida legible, devuelve escala como null. No inventes medidas.

Notas: una o dos frases en espanol con lo que no pudiste leer bien o lo que conviene revisar a mano.

Trabaja con cuidado: recorre primero el perimetro exterior, luego cada division interior, y al final ubica puertas y ventanas.`;

const app = express();
app.use(express.json({ limit: '30mb' }));

app.get('/api/estado', (_req, res) => {
  res.json({ ia: hayClave });
});

app.post('/api/analizar', async (req, res) => {
  if (!cliente) {
    res.status(503).json({ error: 'Falta la clave ANTHROPIC_API_KEY en el archivo .env del servidor.' });
    return;
  }
  const partes = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(req.body?.imagen ?? '');
  if (!partes) {
    res.status(400).json({ error: 'La imagen enviada no es valida.' });
    return;
  }
  try {
    const respuesta = await cliente.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 20000,
      system: INSTRUCCIONES,
      output_config: { effort: 'high', format: zodOutputFormat(Lectura) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: partes[1], data: partes[2] } },
            { type: 'text', text: 'Extrae los muros, puertas, ventanas y la escala de este plano.' },
          ],
        },
      ],
    });
    if (respuesta.stop_reason === 'refusal') {
      res.status(422).json({ error: 'El modelo no pudo procesar esta imagen.' });
      return;
    }
    if (respuesta.stop_reason === 'max_tokens' || !respuesta.parsed_output) {
      res.status(422).json({ error: 'El plano es demasiado complejo para leerlo de una vez. Recortalo por zonas.' });
      return;
    }
    res.json(respuesta.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      res.status(401).json({ error: 'La clave de Anthropic no es valida.' });
    } else if (error instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'Se alcanzo el limite de uso de la API. Intenta de nuevo en un momento.' });
    } else if (error instanceof Anthropic.APIError) {
      res.status(502).json({ error: `Error de la API (${error.status ?? 'red'}): ${error.message}` });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Error inesperado al analizar el plano.' });
    }
  }
});

// En produccion el mismo servidor entrega la aplicacion ya compilada.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const puerto = Number(process.env.PORT) || 8787;
app.listen(puerto, () => {
  console.log(`Planos 3D en http://localhost:${puerto}  (IA ${hayClave ? 'activa' : 'sin clave'})`);
});
