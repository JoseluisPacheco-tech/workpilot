# Planos 3D

Convierte planos arquitectonicos en modelos 3D desde el navegador.

## Que hace

- **Abre** planos en JPG, PNG, PDF (primera pagina) o DXF. Los DWG hay que guardarlos antes como DXF.
- **Lee el plano con IA**: detecta muros, puertas, ventanas y la escala a partir de la imagen o el PDF.
- **Editor 2D** para corregir o dibujar desde cero: muros con iman y angulo recto, puertas, ventanas, ajuste de escala con dos puntos, deshacer y rehacer.
- **Vista 3D en vivo** con pisos y areas por habitacion.
- **Exporta** a GLB, OBJ y STL, y guarda el proyecto en un archivo `.json`.

Los DXF se convierten directo, sin IA: las paredes de doble linea se unen en un solo muro con su grosor.

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
| `src/ia.ts`, `server/index.js` | Lectura automatica con Claude |
| `src/exportar.ts` | Exportacion GLB, OBJ, STL y proyecto |

## Pendiente

- Planos de piezas mecanicas (extrusion de perfiles y vistas).
- Varias plantas, techos y escaleras.
- Elegir pagina en PDF de varias hojas; bloques (INSERT) y arcos en DXF.
