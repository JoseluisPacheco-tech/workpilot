# Planos 3D

Convierte planos arquitectonicos en modelos 3D desde el navegador.

## Que hace

- **Abre** planos en JPG, PNG, PDF (primera pagina), DXF y DWG. En los archivos CAD eliges que capas son muros y cual trae los poligonos de areas utiles.
- **Lee el plano con IA**: detecta muros, puertas, ventanas y la escala a partir de la imagen o el PDF.
- **Editor 2D** para corregir o dibujar desde cero: muros con iman y angulo recto, puertas, ventanas, ajuste de escala con dos puntos, deshacer y rehacer.
- **Vista 3D en vivo** con pisos y areas por habitacion.
- **Evalua la Cedula del Inmueble** (IMSS, modelo de 8 salas, VCU): mide el area util de cada local, la compara con lo declarado en la cedula PDF y marca diferencias e incumplimientos.
- **Exporta** a GLB, OBJ y STL, y guarda el proyecto en un archivo `.json`.

Los DXF y DWG se convierten directo, sin IA: las paredes de doble linea se unen en un solo muro con su grosor.

## Cedula de evaluacion

1. Abre el DWG y elige la capa de poligonos de areas (por ejemplo `00-poligonos`). Cada poligono se asigna a su local por el rotulo que tiene dentro.
2. Abre el PDF de la cedula. Se leen areas, capacidades, vanos, niveles y respuestas declaradas.
3. En la vista Cedula aparecen las diferencias. Los poligonos sin rotulo se asignan a mano desde el panel derecho.

Criterios tomados del formato oficial: area util a cara interior de muro, truncada a dos decimales; capacidad maxima por sala; puertas de salas de 0.90 m; pasillos y salida de emergencia de 1.20 m. Sin DWG, la herramienta Local permite marcar cada habitacion dibujada.

## Como usarlo

```bash
npm install
cp .env.example .env   # y escribe tu ANTHROPIC_API_KEY
npm run dev
```

Abre http://localhost:5173. Sin la clave todo funciona menos el boton "Leer con IA".

Para publicarlo:

```bash
npm run build
npm start              # sirve la app y la API en el puerto 8787
```

## Flujo recomendado

1. Abre el plano.
2. Ajusta la escala: herramienta Escala, dos clics sobre una cota y escribe la medida real.
3. Pulsa "Leer con IA" o traza los muros encima del plano.
4. Corrige lo necesario, revisa el 3D y exporta.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `src/modelo.ts` | Tipos del plano y utilidades de geometria |
| `src/Editor.tsx` | Editor 2D |
| `src/Visor.tsx`, `src/escena.ts` | Vista y geometria 3D |
| `src/cuartos.ts` | Deteccion de habitaciones y areas |
| `src/importar.ts` | Lectura de imagen, PDF y DXF |
| `src/cedula.ts`, `src/Cedula.tsx` | Catalogo y evaluacion de la cedula |
| `src/Capas.tsx` | Selector de capas de archivos CAD |
| `src/ia.ts`, `server/index.js` | Lectura automatica con Claude |
| `src/exportar.ts` | Exportacion GLB, OBJ, STL y proyecto |

## Pendiente

- Planos de piezas mecanicas (extrusion de perfiles y vistas).
- Varias plantas, techos y escaleras.
- Elegir pagina en PDF de varias hojas; bloques (INSERT) en DXF y DWG.
- Puertas y vanos leidos directo del archivo CAD; plantas separadas por nivel en el 3D.

## Licencias

La lectura de DWG usa `@mlightcad/libredwg-web`, con licencia GPL-3.0. Tenlo en cuenta si distribuyes la aplicacion.
