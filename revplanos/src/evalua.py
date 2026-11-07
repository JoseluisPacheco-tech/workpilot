"""Evaluación por reglas: cruza el extracto del plano contra una cédula.

Esta etapa no usa IA (cero tokens). Cada espacio de la cédula se busca por
alias entre las etiquetas del plano; el puntaje se calcula con la ponderación
de la propia cédula. Lo que no se puede verificar desde los textos queda
marcado como "revisión manual" (o para la etapa de IA).
"""
import json
import sys

from extrae import normaliza


def etiquetasPlanas(extracto: dict) -> list[str]:
    planas = []
    for lista in extracto["etiquetas"].values():
        for e in lista:
            planas.append(normaliza(e["texto"]) if isinstance(e, dict) else normaliza(e))
    return planas


def buscaAlias(alias: list[str], planas: list[str]) -> str | None:
    for a in alias:
        an = normaliza(a)
        for p in planas:
            if an in p:
                return p
    return None


def evalua(extracto: dict, cedula: dict) -> dict:
    planas = etiquetasPlanas(extracto)
    secciones = {}
    rechazos = []

    for claveSeccion, seccion in cedula["secciones"].items():
        resultados = []
        detectados = faltantes = manuales = 0
        for esp in seccion["espacios"]:
            if esp.get("manual"):
                estado, evidencia = "revisión manual", None
                manuales += 1
            else:
                evidencia = buscaAlias(esp["alias"], planas)
                if evidencia:
                    estado = "detectado"
                    detectados += 1
                else:
                    estado = "no detectado"
                    faltantes += 1
                    if claveSeccion == "seguridad":
                        rechazos.append(esp["nombre"])
            resultados.append({
                "clave": esp["clave"],
                "nombre": esp["nombre"],
                "estado": estado,
                "evidencia": evidencia,
            })

        total = detectados + faltantes
        peso = cedula["ponderacion"].get(claveSeccion, 0)
        puntaje = peso * (detectados / total) if total else 0.0
        secciones[claveSeccion] = {
            "titulo": seccion["titulo"],
            "peso": peso,
            "detectados": detectados,
            "faltantes": faltantes,
            "manuales": manuales,
            "puntaje": round(puntaje, 4),
            "espacios": resultados,
        }

    puntajeTotal = round(sum(s["puntaje"] for s in secciones.values()), 4)
    return {
        "cedula": cedula["nombre"],
        "puntajeTotal": puntajeTotal,
        "puntajeMaximo": round(sum(
            s["peso"] for s in secciones.values()
            if s["detectados"] + s["faltantes"] > 0
        ), 4),
        "motivosDeRechazo": rechazos,
        "secciones": secciones,
    }


def resumenTexto(informe: dict) -> str:
    lineas = [
        f"Cédula: {informe['cedula']}",
        f"Puntaje: {informe['puntajeTotal']} / {informe['puntajeMaximo']} (verificable desde el plano)",
    ]
    if informe["motivosDeRechazo"]:
        lineas.append("MOTIVOS DE RECHAZO: " + "; ".join(informe["motivosDeRechazo"]))
    for s in informe["secciones"].values():
        lineas.append(f"\n[{s['titulo']}] {s['detectados']} detectados, "
                      f"{s['faltantes']} faltantes, {s['manuales']} a revisión manual")
        for e in s["espacios"]:
            marca = {"detectado": "+", "no detectado": "X", "revisión manual": "?"}[e["estado"]]
            lineas.append(f"  {marca} {e['nombre']}")
    return "\n".join(lineas)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("uso: python evalua.py extracto.json cedula.json informe.json")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        extracto = json.load(f)
    with open(sys.argv[2], encoding="utf-8") as f:
        cedula = json.load(f)
    informe = evalua(extracto, cedula)
    with open(sys.argv[3], "w", encoding="utf-8") as f:
        json.dump(informe, f, ensure_ascii=False, indent=1)
    print(resumenTexto(informe))
