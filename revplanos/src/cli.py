"""Orquestador: DWG -> DXF -> extracto -> evaluación -> (opcional) IA.

uso:
  python cli.py revisa plano.dwg --cedula ../cedulas/ochosalas.json [--ia] [--modelo id]

Deja en la carpeta informes/ los archivos:
  <plano>.dxf, <plano>-extracto.json, <plano>-informe.json, <plano>-informe.txt
  y, con --ia, <plano>-dictamen.json
"""
import argparse
import json
import os
import sys

import convierte
import extrae as ext
import evalua as ev


def revisa(rutaDwg: str, rutaCedula: str, usarIa: bool, modelo: str | None,
           carpetaSalida: str) -> None:
    base = os.path.splitext(os.path.basename(rutaDwg))[0].replace("_", "-")
    os.makedirs(carpetaSalida, exist_ok=True)

    print("1/4 convirtiendo DWG a DXF...")
    rutaDxf = os.path.join(carpetaSalida, base + ".dxf")
    convierte.dwg_a_dxf(rutaDwg, rutaDxf)

    print("2/4 extrayendo contenido...")
    extracto = ext.extrae(rutaDxf)
    with open(os.path.join(carpetaSalida, base + "-extracto.json"), "w",
              encoding="utf-8") as f:
        json.dump(extracto, f, ensure_ascii=False, indent=1)

    print("3/4 evaluando contra la cédula...")
    with open(rutaCedula, encoding="utf-8") as f:
        cedula = json.load(f)
    informe = ev.evalua(extracto, cedula)
    with open(os.path.join(carpetaSalida, base + "-informe.json"), "w",
              encoding="utf-8") as f:
        json.dump(informe, f, ensure_ascii=False, indent=1)
    texto = ev.resumenTexto(informe)
    with open(os.path.join(carpetaSalida, base + "-informe.txt"), "w",
              encoding="utf-8") as f:
        f.write(texto)
    print(texto)

    if usarIa:
        print("\n4/4 analizando pendientes con IA...")
        import analista
        dictamen = analista.analiza(ext.compacta(extracto), informe, cedula,
                                    modelo or analista.MODELO)
        with open(os.path.join(carpetaSalida, base + "-dictamen.json"), "w",
                  encoding="utf-8") as f:
            f.write(dictamen.model_dump_json(indent=1))
        print(f"hallazgos de la IA: {len(dictamen.hallazgos)}")
    else:
        print("\n4/4 (etapa de IA omitida; usa --ia para activarla)")


def main() -> None:
    p = argparse.ArgumentParser(description="Revisión de planos DWG contra cédulas")
    sub = p.add_subparsers(dest="comando", required=True)

    r = sub.add_parser("revisa", help="pipeline completo sobre un DWG")
    r.add_argument("plano", help="ruta del archivo .dwg")
    r.add_argument("--cedula", required=True, help="JSON de la cédula a aplicar")
    r.add_argument("--ia", action="store_true", help="activar la etapa de IA")
    r.add_argument("--modelo", default=None, help="id del modelo de Claude")
    r.add_argument("--salida", default="informes", help="carpeta de resultados")

    args = p.parse_args()
    if args.comando == "revisa":
        revisa(args.plano, args.cedula, args.ia, args.modelo, args.salida)


if __name__ == "__main__":
    main()
