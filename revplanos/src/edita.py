"""Edición del plano: aplica cambios sobre el DXF con ezdxf.

Los cambios se describen en un JSON de instrucciones (que puede generar la IA
o escribirse a mano); el código los ejecuta de forma determinista. Después,
convierte.py regresa el DXF editado a DWG.

Formato de instrucciones:
[
  {"accion": "cambiarTexto", "buscar": "BODEGA GRAL 1", "nuevo": "BODEGA GENERAL"},
  {"accion": "agregarNota", "texto": "REVISADO 2026", "x": 10, "y": 5, "altura": 0.5, "capa": "A-TEXTO"}
]
"""
import json
import sys

import ezdxf


def cambiarTexto(msp, buscar: str, nuevo: str) -> int:
    cambiados = 0
    for e in msp.query("TEXT"):
        if buscar in e.dxf.text:
            e.dxf.text = e.dxf.text.replace(buscar, nuevo)
            cambiados += 1
    return cambiados


def agregarNota(msp, texto: str, x: float, y: float,
                altura: float = 0.5, capa: str = "0") -> None:
    msp.add_text(texto, dxfattribs={"height": altura, "layer": capa,
                                    "insert": (x, y)})


def aplica(rutaDxf: str, instrucciones: list[dict], destino: str) -> dict:
    doc = ezdxf.readfile(rutaDxf)
    msp = doc.modelspace()
    bitacora = []
    for ins in instrucciones:
        if ins["accion"] == "cambiarTexto":
            n = cambiarTexto(msp, ins["buscar"], ins["nuevo"])
            bitacora.append(f"cambiarTexto '{ins['buscar']}' -> '{ins['nuevo']}': {n} textos")
        elif ins["accion"] == "agregarNota":
            agregarNota(msp, ins["texto"], ins["x"], ins["y"],
                        ins.get("altura", 0.5), ins.get("capa", "0"))
            bitacora.append(f"agregarNota '{ins['texto']}'")
        else:
            bitacora.append(f"acción desconocida: {ins['accion']}")
    doc.saveas(destino)
    return {"destino": destino, "bitacora": bitacora}


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("uso: python edita.py plano.dxf instrucciones.json salida.dxf")
        sys.exit(1)
    with open(sys.argv[2], encoding="utf-8") as f:
        instrucciones = json.load(f)
    resultado = aplica(sys.argv[1], instrucciones, sys.argv[3])
    for linea in resultado["bitacora"]:
        print(" ", linea)
