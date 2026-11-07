"""Etapa opcional de IA: interpreta lo que las reglas no pueden verificar.

Diseñada para gastar el mínimo de tokens:
 - Nunca recibe el plano ni el DXF: solo el extracto compacto (unos KB).
 - La cédula y las instrucciones van en el bloque de sistema con prompt
   caching, así las evaluaciones repetidas del mismo prototipo reutilizan
   el 90% del costo de entrada.
 - La salida es estructurada (JSON validado), sin prosa de relleno.
"""
import json
import sys

import anthropic
from pydantic import BaseModel

MODELO = "claude-opus-5-5"

INSTRUCCIONES = """Eres revisor de planos arquitectónicos de guarderías IMSS.
Recibes: (1) el extracto de textos de un plano DWG agrupados por capa y
(2) el informe de la evaluación automática por reglas.
Tu trabajo es SOLO lo que las reglas no pudieron resolver:
 - espacios marcados "no detectado" que sí aparezcan en el extracto con otro
   nombre o abreviatura (indica la etiqueta exacta que lo demuestra);
 - puntos de "revisión manual" sobre los que el extracto dé indicios
   (niveles, fracciones del área de juegos, uso exclusivo);
 - inconsistencias entre etiquetas del plano (duplicados, nombres contradictorios).
No repitas lo que las reglas ya confirmaron. Sé breve y concreto."""


class Hallazgo(BaseModel):
    clave: str
    veredicto: str          # "existe" | "no existe" | "indicio" | "inconsistencia"
    evidencia: str          # etiqueta(s) del plano que lo sustentan
    nota: str


class Dictamen(BaseModel):
    hallazgos: list[Hallazgo]
    observaciones: str


def analiza(extractoCompacto: dict, informeReglas: dict, cedula: dict,
            modelo: str = MODELO) -> Dictamen:
    cliente = anthropic.Anthropic()

    pendientes = []
    for s in informeReglas["secciones"].values():
        for e in s["espacios"]:
            if e["estado"] != "detectado":
                pendientes.append({"clave": e["clave"], "nombre": e["nombre"],
                                   "estado": e["estado"]})

    respuesta = cliente.messages.parse(
        model=modelo,
        max_tokens=4096,
        system=[{
            "type": "text",
            "text": INSTRUCCIONES + "\n\nCÉDULA:\n" + json.dumps(
                cedula, ensure_ascii=False, separators=(",", ":")),
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{
            "role": "user",
            "content": "EXTRACTO DEL PLANO:\n" + json.dumps(
                extractoCompacto, ensure_ascii=False, separators=(",", ":"))
            + "\n\nPENDIENTES DE LAS REGLAS:\n" + json.dumps(
                pendientes, ensure_ascii=False, separators=(",", ":")),
        }],
        output_format=Dictamen,
    )
    uso = respuesta.usage
    print(f"tokens -> entrada: {uso.input_tokens}, "
          f"caché leída: {uso.cache_read_input_tokens}, "
          f"caché creada: {uso.cache_creation_input_tokens}, "
          f"salida: {uso.output_tokens}", file=sys.stderr)
    return respuesta.parsed_output


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("uso: python analista.py extracto.json informe.json cedula.json dictamen.json [modelo]")
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        extracto = json.load(f)
    with open(sys.argv[2], encoding="utf-8") as f:
        informe = json.load(f)
    with open(sys.argv[3], encoding="utf-8") as f:
        cedula = json.load(f)
    modelo = sys.argv[5] if len(sys.argv) > 5 else MODELO
    dictamen = analiza(extracto, informe, cedula, modelo)
    with open(sys.argv[4], "w", encoding="utf-8") as f:
        f.write(dictamen.model_dump_json(indent=1))
    print(f"hallazgos: {len(dictamen.hallazgos)}")
