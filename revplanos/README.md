# revplanos — revisión de planos DWG con reglas + IA

Pipeline que lee planos arquitectónicos en formato **DWG**, extrae su contenido,
los evalúa contra una **cédula de autoevaluación de inmueble** (IMSS guarderías)
y puede aplicar cambios y regresar un DWG editado.

## Arquitectura (pensada para gastar el mínimo de tokens)

```
plano.dwg
   │  convierte.py  (aspose-cad: DWG -> DXF conservando textos)
   ▼
plano.dxf  (texto plano, ~100-200 MB; la IA NUNCA lo ve)
   │  extrae.py  (ezdxf: capas, textos agrupados espacialmente)
   ▼
extracto.json  (unos KB: capas + etiquetas de locales)
   │  evalua.py  (reglas puras, CERO tokens: cruza contra la cédula)
   ▼
informe.json / informe.txt  (puntaje por sección + motivos de rechazo)
   │  analista.py  (OPCIONAL: solo los pendientes van a Claude,
   │   con prompt caching y salida estructurada)
   ▼
dictamen.json
```

Claves del ahorro de tokens:

1. **La IA nunca recibe el archivo.** Solo el extracto compacto (unos KB en
   lugar de megas).
2. **Las reglas medibles se verifican en código** (presencia de espacios,
   ponderación de la cédula): cero tokens. La IA solo revisa lo ambiguo.
3. **Prompt caching:** la cédula y las instrucciones van en el bloque de
   sistema con `cache_control`, así evaluar muchos planos del mismo prototipo
   reutiliza ~90% del costo de entrada.
4. **Salida estructurada** (JSON validado con pydantic): sin prosa de relleno.

## Uso

```bash
cd revplanos/src
python cli.py revisa /ruta/plano.dwg --cedula ../cedulas/ochosalas.json
```

Con la etapa de IA (requiere `ANTHROPIC_API_KEY` en el entorno):

```bash
python cli.py revisa /ruta/plano.dwg --cedula ../cedulas/ochosalas.json --ia
```

Para editar y regresar a DWG:

```bash
python edita.py informes/plano.dxf cambios.json informes/plano-editado.dxf
python convierte.py informes/plano-editado.dxf informes/plano-editado.dwg
```

## Instalación

```bash
pip install -r requirements.txt
```

El runtime .NET de aspose-cad necesita en Ubuntu 24.04 la librería
OpenSSL 1.1 (ya no viene en los repos):

```bash
curl -sSO http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2.24_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2.24_amd64.deb
```

La variable `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` la fija `convierte.py`
automáticamente.

## Diseño: motor general + cédulas por tipo de inmueble

- El **motor** (convierte/extrae/edita) es general: funciona con cualquier
  DWG, no solo guarderías.
- Lo específico de guarderías vive en `cedulas/*.json`. Para evaluar otro
  tipo de plano basta con escribir otra cédula (espacios, alias, ponderación)
  sin tocar el motor. `cedulas/ochosalas.json` está derivada de la cédula
  IMSS "8 salas de atención".

## Limitaciones actuales

- La conversión con aspose-cad (gratuita) explota los bloques a polilíneas:
  se conservan textos y geometría, pero no las áreas por local (las
  polilíneas no quedan cerradas), así que las superficies mínimas de la
  cédula quedan como "revisión manual". Para fidelidad total en un servidor
  propio: compilar [LibreDWG](https://github.com/LibreDWG/libredwg) o instalar
  el ODA File Converter (gratuito) y conservar DXF 2018 nativo.
- La vuelta DXF -> DWG con aspose también pasa por su exportador; verificar
  el resultado en AutoCAD antes de usarlo como entregable.

## Despliegue sugerido

Un servidor (o contenedor) con este pipeline expuesto como API o vigilando
una carpeta (Drive/red): cada DWG nuevo o modificado se convierte, se evalúa
y se publica el informe. El costo de IA por plano es de centavos gracias al
extracto compacto y el caché.
