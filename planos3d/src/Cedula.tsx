import { useMemo, useRef } from 'react';
import { Seleccion } from './Editor';
import { REQUISITOS, SECCIONES, SEGURIDAD, aCsv, areaLocal, evaluar } from './cedula';
import { Cuarto } from './cuartos';
import { descargar } from './exportar';
import { Plano } from './modelo';

type Props = {
  plano: Plano;
  cuartos: Cuarto[];
  sel: Seleccion;
  setSel: (s: Seleccion) => void;
  cambiar: (p: Plano) => void;
  cargar: (archivo: File) => void;
};

const UBICACION = [
  { id: 'u1', texto: 'Las salas de atencion se encuentran solo en planta baja' },
  { id: 'u2', texto: 'Las salas de atencion se encuentran solo en planta alta' },
  { id: 'u3', texto: 'Las salas de atencion se encuentran en planta baja y planta alta' },
];

export default function Cedula({ plano, cuartos, sel, setSel, cambiar, cargar }: Props) {
  const ev = useMemo(() => evaluar(plano, cuartos), [plano, cuartos]);
  const entradaPdf = useRef<HTMLInputElement>(null);
  const r = plano.cedula.respuestas;
  const d = plano.cedula.declarado;
  const hayDeclarado = Object.keys(d).length > 0;

  const responder = (id: string, valor: string) =>
    cambiar({ ...plano, cedula: { ...plano.cedula, respuestas: { ...r, [id]: valor } } });

  const declarar = (clave: string, texto: string) => {
    const v = parseFloat(texto.replace(',', '.'));
    const nuevo = { ...d };
    if (Number.isFinite(v)) nuevo[clave] = v;
    else delete nuevo[clave];
    cambiar({ ...plano, cedula: { ...plano.cedula, declarado: nuevo } });
  };

  const pregunta = (q: { id: string; texto: string }) => {
    const valor = r[q.id] || '';
    const sugerida = ev.auto[q.id];
    const choca = valor && sugerida && valor !== sugerida;
    return (
      <tr key={q.id} className={(valor || sugerida) === 'NO' && q.id.startsWith('r') ? 'mal' : ''}>
        <td>{q.texto}</td>
        <td className="corta">
          <select value={valor} onChange={(e) => responder(q.id, e.target.value)}>
            <option value="">{sugerida ? `${sugerida} (plano)` : '—'}</option>
            <option>SI</option>
            <option>NO</option>
          </select>
          {choca && <span className="marca" title={`Segun el plano la respuesta es ${sugerida}`}>≠</span>}
        </td>
      </tr>
    );
  };

  const errores = ev.hallazgos.filter((h) => h.tipo === 'error').length;
  const avisos = ev.hallazgos.filter((h) => h.tipo === 'aviso').length;

  return (
    <div className="cedula">
      <div className="cabeza">
        <div>
          <h2>Cedula de Evaluacion del Inmueble</h2>
          <p>Modelo de 8 salas de atencion, VCU. Las areas son utiles (a cara interior de muro) y se truncan a dos decimales.</p>
        </div>
        <input ref={entradaPdf} type="file" accept=".pdf" hidden onChange={(e) => { const a = e.target.files?.[0]; if (a) cargar(a); e.target.value = ''; }} />
        <button onClick={() => entradaPdf.current?.click()}>Cargar cedula PDF</button>
        <button className="primario" onClick={() => descargar(aCsv(ev, plano), 'cedula.csv', 'text/csv')}>Exportar CSV</button>
      </div>

      <div className="tarjetas">
        <div><b>{ev.capacidad || '—'}</b><span>capacidad total</span></div>
        <div><b>{plano.locales.length - ev.sinAsignar.length}</b><span>locales marcados</span></div>
        <div className={errores ? 'rojo' : ''}><b>{errores}</b><span>hallazgos graves</span></div>
        <div className={avisos ? 'ambar' : ''}><b>{avisos}</b><span>diferencias</span></div>
      </div>

      {!plano.locales.length && (
        <p className="vacio">
          Todavia no hay locales. Usa la herramienta Local y haz clic dentro de cada habitacion para decir que es,
          o abre un DWG que traiga la capa de poligonos de areas.
        </p>
      )}

      {ev.hallazgos.length > 0 && (
        <section>
          <h3>Hallazgos</h3>
          <ul className="hallazgos">
            {ev.hallazgos.map((h, i) => <li key={i} className={h.tipo}>{h.texto}</li>)}
          </ul>
        </section>
      )}

      {ev.sinAsignar.length > 0 && (
        <section>
          <h3>Poligonos sin asignar ({ev.sinAsignar.length})</h3>
          <div className="fichas">
            {[...ev.sinAsignar].sort((a, b) => areaLocal(b, cuartos) - areaLocal(a, cuartos)).map((l) => (
              <button key={l.id} className={sel?.id === l.id ? 'activo' : ''} onClick={() => setSel({ tipo: 'local', id: l.id })}>
                {areaLocal(l, cuartos).toFixed(2)} m²
              </button>
            ))}
          </div>
          <p className="nota">Selecciona cada uno para ver donde esta y asignale su local en el panel derecho, o borralo con Supr.</p>
        </section>
      )}

      {SECCIONES.map((s) => {
        const filas = ev.filas.filter((f) => f.e.seccion === s.id);
        const conCap = s.id === 'salas';
        return (
          <section key={s.id}>
            <h3>{s.titulo}</h3>
            <table>
              <thead>
                <tr>
                  <th>Local</th><th>Nivel</th>{conCap && <th>Cap.</th>}<th>Medida</th><th>Declarada</th><th>Dif.</th><th>Vano</th><th>Vent. / Ilum.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const existe = f.locales.length > 0;
                  const decl = f.declArea;
                  const dif = existe && decl ? f.area - decl : 0;
                  const cap = f.capacidad || f.declCap || 0;
                  const vano = f.vano ?? f.declVano ?? null;
                  return (
                    <tr
                      key={f.e.clave}
                      className={(existe ? '' : 'falta ') + (f.locales.some((l) => l.id === sel?.id) ? 'elegida' : '')}
                      onClick={() => existe && setSel({ tipo: 'local', id: f.locales[0].id })}
                    >
                      <td>{f.e.nombre}{f.locales.length > 1 && <small> ×{f.locales.length}</small>}</td>
                      <td>{f.nivel || '—'}</td>
                      {conCap && <td className={f.e.max && cap > f.e.max ? 'num mal' : 'num'}>{cap || '—'}<small>/{f.e.max}</small></td>}
                      <td className="num">{existe ? f.area.toFixed(2) : '—'}</td>
                      <td className="num">
                        <input
                          key={decl ?? 'x'} defaultValue={decl !== undefined ? decl.toFixed(2) : ''} placeholder="—" inputMode="decimal"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => { if (e.target.value !== (decl !== undefined ? decl.toFixed(2) : '')) declarar('area:' + f.e.clave, e.target.value); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                      </td>
                      <td className={'num ' + (Math.abs(dif) > 0.5 ? 'mal' : Math.abs(dif) > 0.02 ? 'ojo' : '')}>
                        {existe && decl ? (dif > 0 ? '+' : '') + dif.toFixed(2) : ''}
                      </td>
                      <td className={'num ' + (conCap && vano !== null && vano > 0 && vano < 0.9 ? 'mal' : '')}>{vano ? vano.toFixed(2) : '—'}</td>
                      <td>{[f.vent, f.ilum].filter(Boolean).join(' / ').toLowerCase() || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}

      <section>
        <h3>Ubicacion de las salas</h3>
        <table className="preguntas"><tbody>{UBICACION.map(pregunta)}</tbody></table>
      </section>
      <section>
        <h3>I. Requisitos obligatorios (su incumplimiento desecha el inmueble)</h3>
        <table className="preguntas"><tbody>{REQUISITOS.map(pregunta)}</tbody></table>
      </section>
      <section>
        <h3>Requerimientos de seguridad</h3>
        <table className="preguntas"><tbody>{SEGURIDAD.map(pregunta)}</tbody></table>
      </section>
      {hayDeclarado && (
        <button className="peligro" onClick={() => cambiar({ ...plano, cedula: { respuestas: {}, declarado: {} } })}>
          Quitar los datos de la cedula cargada
        </button>
      )}
    </div>
  );
}
