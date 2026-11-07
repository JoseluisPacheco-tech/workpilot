"""Extracción de un DXF a un extracto JSON compacto.

El extracto es lo único que ve la IA: capas, etiquetas de texto agrupadas
espacialmente y métricas básicas. Un DWG de 2 MB se reduce a unos cuantos KB.
"""
import collections
import json
import re
import sys
import unicodedata

import ezdxf


def decodifica(t: str) -> str:
    """Convierte secuencias \\U+XXXX de AutoCAD a Unicode real."""
    return re.sub(r"\\U\+([0-9A-Fa-f]{4})", lambda m: chr(int(m.group(1), 16)), t)


def normaliza(t: str) -> str:
    """Mayúsculas y sin acentos, para comparar contra alias de la cédula."""
    t = unicodedata.normalize("NFD", t.upper())
    return "".join(c for c in t if unicodedata.category(c) != "Mn").strip()


def agrupa(textos: list[dict]) -> list[dict]:
    """Une fragmentos de texto cercanos en etiquetas completas (union-find)."""
    n = len(textos)
    padre = list(range(n))

    def find(a):
        while padre[a] != a:
            padre[a] = padre[padre[a]]
            a = padre[a]
        return a

    for i in range(n):
        for j in range(i + 1, n):
            a, b = textos[i], textos[j]
            lim = max(a["h"], b["h"])
            if abs(a["x"] - b["x"]) < lim * 14 and abs(a["y"] - b["y"]) < lim * 2.2:
                padre[find(i)] = find(j)

    grupos = collections.defaultdict(list)
    for i in range(n):
        grupos[find(i)].append(textos[i])

    etiquetas = []
    for g in grupos.values():
        g.sort(key=lambda it: (-round(it["y"], 1), it["x"]))
        txt = re.sub(r"\s+", " ", " ".join(it["t"] for it in g)).strip()
        if txt:
            etiquetas.append({
                "texto": txt,
                "x": round(sum(it["x"] for it in g) / len(g), 1),
                "y": round(sum(it["y"] for it in g) / len(g), 1),
            })
    etiquetas.sort(key=lambda e: (-e["y"], e["x"]))
    return etiquetas


def extrae(rutaDxf: str) -> dict:
    doc = ezdxf.readfile(rutaDxf)
    msp = doc.modelspace()

    porCapa = collections.defaultdict(list)
    for e in msp.query("TEXT"):
        p = e.dxf.insert
        porCapa[e.dxf.layer].append({
            "t": decodifica(e.dxf.text).strip(),
            "x": p.x, "y": p.y, "h": e.dxf.height,
        })
    for e in msp.query("MTEXT"):
        p = e.dxf.insert
        porCapa[e.dxf.layer].append({
            "t": decodifica(e.plain_text()).strip(),
            "x": p.x, "y": p.y, "h": e.dxf.char_height,
        })

    tiposEntidad = collections.Counter(e.dxftype() for e in msp)

    etiquetas = {}
    for capa, textos in porCapa.items():
        agrupadas = agrupa(textos)
        # deduplicar conservando orden
        vistos, lista = set(), []
        for a in agrupadas:
            clave = normaliza(a["texto"])
            if clave and clave not in vistos:
                vistos.add(clave)
                lista.append(a)
        etiquetas[capa] = lista

    return {
        "archivo": rutaDxf,
        "versionDxf": doc.dxfversion,
        "capas": sorted(l.dxf.name for l in doc.layers),
        "entidades": dict(tiposEntidad),
        "etiquetas": etiquetas,
    }


def compacta(extracto: dict, maxPorCapa: int = 120) -> dict:
    """Versión mínima del extracto para mandar a la IA (solo texto, sin coordenadas)."""
    return {
        "capas": extracto["capas"],
        "etiquetas": {
            capa: [e["texto"] for e in lista[:maxPorCapa]]
            for capa, lista in extracto["etiquetas"].items()
            if lista
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("uso: python extrae.py plano.dxf extracto.json")
        sys.exit(1)
    resultado = extrae(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=1)
    totalEtiquetas = sum(len(v) for v in resultado["etiquetas"].values())
    print(f"capas: {len(resultado['capas'])} | etiquetas: {totalEtiquetas}")
