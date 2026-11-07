"""Conversión DWG <-> DXF usando aspose-cad (runtime .NET)."""
import os
import sys

# El runtime .NET de aspose necesita esto antes de importarse
os.environ.setdefault("DOTNET_SYSTEM_GLOBALIZATION_INVARIANT", "1")

import aspose.cad as cad  # noqa: E402
from aspose.cad.imageoptions import DxfOptions, DwgOptions  # noqa: E402


def dwg_a_dxf(origen: str, destino: str) -> str:
    """Convierte un DWG a DXF conservando textos como entidades TEXT."""
    img = cad.Image.load(origen)
    opts = DxfOptions()
    opts.text_as_lines = False       # conservar TEXT (clave para el análisis)
    opts.convert_mesh_to_lines = False
    img.save(destino, opts)
    return destino


def dxf_a_dwg(origen: str, destino: str) -> str:
    """Convierte un DXF (por ejemplo, ya editado) de vuelta a DWG."""
    img = cad.Image.load(origen)
    img.save(destino, DwgOptions())
    return destino


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("uso: python convierte.py entrada.dwg salida.dxf  (o entrada.dxf salida.dwg)")
        sys.exit(1)
    entrada, salida = sys.argv[1], sys.argv[2]
    if salida.lower().endswith(".dxf"):
        dwg_a_dxf(entrada, salida)
    else:
        dxf_a_dwg(entrada, salida)
    print("convertido:", salida)
