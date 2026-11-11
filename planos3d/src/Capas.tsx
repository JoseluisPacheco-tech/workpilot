import { useMemo, useState } from 'react';
import { Dibujo, Opciones, sugerir } from './importar';

type Props = { dibujo: Dibujo; nombre: string; usar: (op: Opciones) => void; cerrar: () => void };

// Dialogo para decir que capa del archivo CAD son los muros y cual las areas.
export default function Capas({ dibujo, nombre, usar, cerrar }: Props) {
  const [op, setOp] = useState<Opciones>(() => {
    const s = sugerir(dibujo);
    // Un archivo chico sin capa de muros reconocible se toma completo.
    if (!s.muros.length && !s.areas && dibujo.segs.length <= 3000) s.muros = dibujo.capas.map((c) => c.nombre);
    return s;
  });

  // Vista previa de lo elegido: muros en claro, areas en verde.
  const previa = useMemo(() => {
    const segs = dibujo.segs.filter((s) => op.muros.includes(s.capa) || s.capa === op.areas);
    const base = segs.length ? segs : dibujo.segs;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of base) for (const p of [s.a, s.b]) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    const trazo = (lista: typeof segs) => lista.slice(0, 12000).map((s) => `M${s.a.x - x0} ${y1 - s.a.y}L${s.b.x - x0} ${y1 - s.b.y}`).join('');
    return {
      w: Math.max(x1 - x0, 1), h: Math.max(y1 - y0, 1),
      muros: trazo(segs.filter((s) => op.muros.includes(s.capa))),
      areas: trazo(segs.filter((s) => s.capa === op.areas)),
      resto: segs.length ? '' : trazo(base),
    };
  }, [dibujo, op.muros, op.areas]);

  const alternar = (capa: string) =>
    setOp({ ...op, muros: op.muros.includes(capa) ? op.muros.filter((c) => c !== capa) : [...op.muros, capa] });
  const grueso = Math.max(previa.w, previa.h) / 500;

  return (
    <div className="velo" onPointerDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="dialogo">
        <h2>Capas de {nombre}</h2>
        <p className="nota">
          Marca las capas que contienen los muros. Si el archivo trae una capa con los poligonos de areas utiles
          (los que se usan para llenar la cedula), elige cual es.
        </p>
        <div className="capas">
          <div className="lista">
            <label className="campo">
              <span>Capa de areas utiles</span>
              <select value={op.areas} onChange={(e) => setOp({ ...op, areas: e.target.value, muros: op.muros.filter((c) => c !== e.target.value) })}>
                <option value="">Ninguna</option>
                {dibujo.capas.filter((c) => c.cerradas > 0).map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre} ({c.cerradas} poligonos)</option>)}
              </select>
            </label>
            <h3>Capas de muros</h3>
            <div className="filas">
              {dibujo.capas.filter((c) => c.nombre !== op.areas).map((c) => (
                <label key={c.nombre}>
                  <input type="checkbox" checked={op.muros.includes(c.nombre)} onChange={() => alternar(c.nombre)} />
                  <span>{c.nombre || '(sin nombre)'}</span>
                  <em>{c.lineas} lineas</em>
                </label>
              ))}
            </div>
            <label className="suelto">
              <input type="checkbox" checked={op.calco} onChange={(e) => setOp({ ...op, calco: e.target.checked })} />
              Mostrar el resto del dibujo como referencia
            </label>
          </div>
          <svg viewBox={`${-previa.w * 0.03} ${-previa.h * 0.03} ${previa.w * 1.06} ${previa.h * 1.06}`} className="previa">
            <path d={previa.resto} stroke="#465066" strokeWidth={grueso} fill="none" />
            <path d={previa.muros} stroke="#c9d1e0" strokeWidth={grueso} fill="none" />
            <path d={previa.areas} stroke="#34c97b" strokeWidth={grueso} fill="none" />
          </svg>
        </div>
        <div className="acciones">
          <button onClick={cerrar}>Cancelar</button>
          <button className="primario" disabled={!op.muros.length && !op.areas} onClick={() => usar(op)}>Convertir</button>
        </div>
      </div>
    </div>
  );
}
