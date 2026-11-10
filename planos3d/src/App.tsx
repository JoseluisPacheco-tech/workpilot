import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { Herramienta, Seleccion } from './Editor';
import Visor from './Visor';
import { detectarCuartos } from './cuartos';
import { Formato, exportarModelo, guardarProyecto } from './exportar';
import { analizarPlano, iaDisponible } from './ia';
import { leerDxf, leerImagen, leerPdf, leerProyecto } from './importar';
import { ALTO, GROSOR, Hueco, Muro, Plano, dist, largo, limitarPos, planoEjemplo, planoVacio } from './modelo';

const CLAVE = 'planos3d';

function cargarGuardado(): Plano {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (texto) return leerProyecto(texto);
  } catch { /* se empieza en blanco */ }
  return planoVacio();
}

function useHistorial() {
  const [h, setH] = useState(() => ({ pasado: [] as Plano[], actual: cargarGuardado(), futuro: [] as Plano[] }));
  return {
    plano: h.actual,
    hayPasado: h.pasado.length > 0,
    hayFuturo: h.futuro.length > 0,
    cambiar: useCallback((p: Plano) => setH((s) => ({ pasado: [...s.pasado.slice(-99), s.actual], actual: p, futuro: [] })), []),
    marcar: useCallback(() => setH((s) => ({ ...s, pasado: [...s.pasado.slice(-99), s.actual], futuro: [] })), []),
    reemplazar: useCallback((p: Plano) => setH((s) => ({ ...s, actual: p })), []),
    deshacer: useCallback(() => setH((s) => s.pasado.length
      ? { pasado: s.pasado.slice(0, -1), actual: s.pasado[s.pasado.length - 1], futuro: [s.actual, ...s.futuro] } : s), []),
    rehacer: useCallback(() => setH((s) => s.futuro.length
      ? { pasado: [...s.pasado, s.actual], actual: s.futuro[0], futuro: s.futuro.slice(1) } : s), []),
  };
}

const HERRAMIENTAS: { id: Herramienta; nombre: string; tecla: string; ayuda: string }[] = [
  { id: 'sel', nombre: 'Seleccionar', tecla: 'V', ayuda: 'Clic para seleccionar. Arrastra los extremos de un muro o una puerta para moverlos. Supr borra.' },
  { id: 'muro', nombre: 'Muro', tecla: 'M', ayuda: 'Clic para empezar y clic en cada esquina. Doble clic, Enter o Esc para terminar. Mayus desactiva el angulo recto.' },
  { id: 'puerta', nombre: 'Puerta', tecla: 'P', ayuda: 'Clic sobre un muro para colocar una puerta.' },
  { id: 'ventana', nombre: 'Ventana', tecla: 'N', ayuda: 'Clic sobre un muro para colocar una ventana.' },
  { id: 'escala', nombre: 'Escala', tecla: 'E', ayuda: 'Marca dos puntos cuya distancia real conozcas (por ejemplo una cota) y escribe la medida.' },
];

function Num(props: { nombre: string; valor: number; min?: number; max?: number; onCambio: (v: number) => void }) {
  const [texto, setTexto] = useState(props.valor.toFixed(2));
  useEffect(() => setTexto(props.valor.toFixed(2)), [props.valor]);
  const confirmar = () => {
    const v = parseFloat(texto.replace(',', '.'));
    if (!Number.isFinite(v)) return setTexto(props.valor.toFixed(2));
    const limitado = Math.max(props.min ?? 0.01, Math.min(props.max ?? 100, v));
    if (Math.abs(limitado - props.valor) > 1e-4) props.onCambio(limitado);
    else setTexto(props.valor.toFixed(2));
  };
  return (
    <label className="campo">
      <span>{props.nombre}</span>
      <input
        value={texto} inputMode="decimal"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      <em>m</em>
    </label>
  );
}

export default function App() {
  const hist = useHistorial();
  const { plano, cambiar } = hist;
  const [herramienta, setHerramienta] = useState<Herramienta>('sel');
  const [sel, setSel] = useState<Seleccion>(null);
  const [modo, setModo] = useState<'ambas' | '2d' | '3d'>('ambas');
  const [grosor, setGrosor] = useState(GROSOR);
  const [alto, setAlto] = useState(ALTO);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const [ocupado, setOcupado] = useState('');
  const [conIa, setConIa] = useState(false);
  const [encuadre2d, setEncuadre2d] = useState(0);
  const [encuadre3d, setEncuadre3d] = useState(0);
  const [menu, setMenu] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const cuartos = useMemo(() => detectarCuartos(plano.muros), [plano.muros]);
  const areaTotal = cuartos.reduce((s, c) => s + c.area, 0);

  useEffect(() => { iaDisponible().then(setConIa); }, []);

  // Guardado automatico en el navegador.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify({ version: 1, plano }));
      } catch {
        try { localStorage.setItem(CLAVE, JSON.stringify({ version: 1, plano: { ...plano, fondo: null } })); } catch { /* sin espacio */ }
      }
    }, 600);
    return () => clearTimeout(t);
  }, [plano]);

  const encuadrar = () => { setEncuadre2d((n) => n + 1); setEncuadre3d((n) => n + 1); };

  const abrir = async (archivo: File) => {
    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    setOcupado('Abriendo ' + archivo.name + '…');
    setAviso(null);
    try {
      if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext)) {
        cambiar({ ...plano, fondo: await leerImagen(archivo) });
        setAviso({ texto: 'Plano cargado como fondo. Ajusta la escala con dos puntos de medida conocida, y luego usa la IA o traza los muros encima.' });
        setHerramienta('escala');
      } else if (ext === 'pdf') {
        const { fondo, paginas } = await leerPdf(archivo);
        cambiar({ ...plano, fondo });
        setAviso({ texto: `PDF cargado${paginas > 1 ? ` (se usa la pagina 1 de ${paginas})` : ''}. Ajusta la escala y luego usa la IA o traza los muros encima.` });
        setHerramienta('escala');
      } else if (ext === 'dxf') {
        const { muros, nota } = leerDxf(await archivo.text());
        cambiar({ muros, huecos: [], fondo: null });
        setAviso({ texto: `DXF convertido: ${muros.length} muros (${nota}). Agrega puertas y ventanas con las herramientas.` });
        setHerramienta('sel');
      } else if (ext === 'dwg') {
        throw new Error('El formato DWG es cerrado y no se puede leer directo. En AutoCAD usa "Guardar como" y elige DXF, o conviertelo con ODA File Converter (gratuito).');
      } else if (ext === 'json') {
        cambiar(leerProyecto(await archivo.text()));
      } else {
        throw new Error('Formato no reconocido. Usa JPG, PNG, PDF, DXF o un proyecto .json.');
      }
      setSel(null);
      setTimeout(encuadrar, 50);
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo abrir el archivo.', error: true });
    } finally {
      setOcupado('');
    }
  };

  const analizar = async () => {
    if (!plano.fondo) return setAviso({ texto: 'Primero abre la imagen o el PDF del plano.', error: true });
    if (plano.muros.length && !confirm('La lectura automatica reemplaza los muros actuales. ¿Continuar?')) return;
    setOcupado('La IA esta leyendo el plano… puede tardar hasta un minuto.');
    setAviso(null);
    try {
      const r = await analizarPlano(plano.fondo);
      cambiar(r.plano);
      setSel(null);
      setHerramienta('sel');
      setTimeout(encuadrar, 50);
      setAviso({
        texto: `Lectura lista: ${r.plano.muros.length} muros y ${r.plano.huecos.length} huecos. ` +
          (r.conEscala ? '' : 'No se encontro una cota legible: ajusta la escala a mano. ') + r.notas,
      });
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo analizar el plano.', error: true });
    } finally {
      setOcupado('');
    }
  };

  const exportar = async (formato: Formato) => {
    setMenu(false);
    if (!plano.muros.length) return setAviso({ texto: 'Todavia no hay muros que exportar.', error: true });
    try {
      await exportarModelo(plano, formato);
    } catch {
      setAviso({ texto: 'No se pudo exportar el modelo.', error: true });
    }
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? hist.rehacer() : hist.deshacer(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); hist.rehacer(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const h = HERRAMIENTAS.find((x) => x.tecla.toLowerCase() === k);
      if (h) setHerramienta(h.id);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [hist.deshacer, hist.rehacer]);

  const muroSel = sel?.tipo === 'muro' ? plano.muros.find((m) => m.id === sel.id) : undefined;
  const huecoSel = sel?.tipo === 'hueco' ? plano.huecos.find((h) => h.id === sel.id) : undefined;
  const muroDelHueco = huecoSel && plano.muros.find((m) => m.id === huecoSel.muro);

  const editarMuro = (id: string, cambios: Partial<Muro>) =>
    cambiar({ ...plano, muros: plano.muros.map((m) => (m.id === id ? { ...m, ...cambios } : m)) });

  // Cambiar el largo mueve el extremo b y los muros unidos a el.
  const cambiarLargo = (m: Muro, L: number) => {
    const actual = largo(m);
    if (actual < 1e-6) return;
    const b = { x: m.a.x + ((m.b.x - m.a.x) / actual) * L, y: m.a.y + ((m.b.y - m.a.y) / actual) * L };
    cambiar({
      ...plano,
      muros: plano.muros.map((w) => ({
        ...w,
        a: dist(w.a, m.b) < 0.03 && w.id !== m.id ? b : w.a,
        b: dist(w.b, m.b) < 0.03 ? b : w.b,
      })),
    });
  };

  const editarHueco = (h: Hueco, cambios: Partial<Hueco>) => {
    const n = { ...h, ...cambios };
    if (muroDelHueco) n.pos = limitarPos(n.pos, n.ancho, largo(muroDelHueco));
    cambiar({ ...plano, huecos: plano.huecos.map((x) => (x.id === h.id ? n : x)) });
  };

  const borrar = () => {
    if (!sel) return;
    cambiar(sel.tipo === 'muro'
      ? { ...plano, muros: plano.muros.filter((m) => m.id !== sel.id), huecos: plano.huecos.filter((h) => h.muro !== sel.id) }
      : { ...plano, huecos: plano.huecos.filter((h) => h.id !== sel.id) });
    setSel(null);
  };

  const vacio = !plano.muros.length && !plano.fondo;

  return (
    <div
      className="app"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const a = e.dataTransfer.files[0]; if (a) abrir(a); }}
    >
      <header className="barra">
        <h1>Planos <b>3D</b></h1>
        <input
          ref={entrada} type="file" hidden accept=".png,.jpg,.jpeg,.webp,.pdf,.dxf,.dwg,.json"
          onChange={(e) => { const a = e.target.files?.[0]; if (a) abrir(a); e.target.value = ''; }}
        />
        <button className="primario" onClick={() => entrada.current?.click()}>Abrir plano</button>
        <button
          onClick={analizar} disabled={!conIa || !plano.fondo || Boolean(ocupado)}
          title={conIa ? 'Lee el plano de fondo y genera los muros' : 'Configura ANTHROPIC_API_KEY en el servidor para activar la lectura automatica'}
        >
          Leer con IA{!conIa && <i className="punto" />}
        </button>
        <span className="sep" />
        <button onClick={hist.deshacer} disabled={!hist.hayPasado} title="Ctrl+Z">Deshacer</button>
        <button onClick={hist.rehacer} disabled={!hist.hayFuturo} title="Ctrl+Y">Rehacer</button>
        <span className="sep" />
        <div className="grupo">
          {(['2d', 'ambas', '3d'] as const).map((m) => (
            <button key={m} className={modo === m ? 'activo' : ''} onClick={() => { setModo(m); setTimeout(encuadrar, 50); }}>
              {m === 'ambas' ? '2D + 3D' : m.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={encuadrar}>Centrar</button>
        <span className="hueco" />
        <button onClick={() => guardarProyecto(plano)} disabled={vacio}>Guardar</button>
        <div className="menu">
          <button className="primario" onClick={() => setMenu(!menu)} disabled={!plano.muros.length}>Exportar 3D</button>
          {menu && (
            <div className="lista">
              <button onClick={() => exportar('glb')}>GLB <small>Blender, web, visores</small></button>
              <button onClick={() => exportar('obj')}>OBJ <small>SketchUp, 3ds Max</small></button>
              <button onClick={() => exportar('stl')}>STL <small>impresion 3D</small></button>
            </div>
          )}
        </div>
        <button
          onClick={() => { if (vacio || confirm('¿Borrar todo y empezar un plano nuevo?')) { cambiar(planoVacio()); setSel(null); } }}
          disabled={vacio}
        >
          Nuevo
        </button>
      </header>

      <div className="cuerpo">
        <nav className="herramientas">
          {HERRAMIENTAS.map((h) => (
            <button key={h.id} className={herramienta === h.id ? 'activo' : ''} onClick={() => setHerramienta(h.id)} title={`${h.nombre} (${h.tecla})`}>
              {h.nombre}<kbd>{h.tecla}</kbd>
            </button>
          ))}
        </nav>

        <main className={'vistas ' + modo}>
          {modo !== '3d' && (
            <section>
              <Editor
                plano={plano} cuartos={cuartos} herramienta={herramienta} sel={sel} setSel={setSel}
                cambiar={cambiar} marcar={hist.marcar} reemplazar={hist.reemplazar}
                grosor={grosor} alto={alto} encuadre={encuadre2d}
              />
              {vacio && herramienta === 'sel' && (
                <div className="bienvenida">
                  <h2>Convierte un plano en un modelo 3D</h2>
                  <p>Arrastra aqui tu plano (JPG, PNG, PDF o DXF) o abrelo con el boton. Tambien puedes dibujar los muros desde cero con la herramienta Muro.</p>
                  <div>
                    <button className="primario" onClick={() => entrada.current?.click()}>Abrir plano</button>
                    <button onClick={() => { cambiar(planoEjemplo()); setTimeout(encuadrar, 50); }}>Ver un ejemplo</button>
                  </div>
                </div>
              )}
            </section>
          )}
          {modo !== '2d' && (
            <section>
              <Visor plano={plano} cuartos={cuartos} encuadre={encuadre3d} />
            </section>
          )}
        </main>

        <aside className="panel">
          {muroSel && (
            <div className="bloque">
              <h3>Muro</h3>
              <Num nombre="Largo" valor={largo(muroSel)} min={0.1} onCambio={(v) => cambiarLargo(muroSel, v)} />
              <Num nombre="Grosor" valor={muroSel.grosor} min={0.03} max={1} onCambio={(v) => editarMuro(muroSel.id, { grosor: v })} />
              <Num nombre="Altura" valor={muroSel.alto} min={0.3} max={20} onCambio={(v) => editarMuro(muroSel.id, { alto: v })} />
              <button className="peligro" onClick={borrar}>Borrar muro</button>
            </div>
          )}
          {huecoSel && (
            <div className="bloque">
              <h3>{huecoSel.tipo === 'puerta' ? 'Puerta' : 'Ventana'}</h3>
              <Num nombre="Ancho" valor={huecoSel.ancho} min={0.3} max={muroDelHueco ? Math.max(0.3, largo(muroDelHueco) - 0.1) : 10} onCambio={(v) => editarHueco(huecoSel, { ancho: v })} />
              <Num nombre="Alto" valor={huecoSel.alto} min={0.3} max={10} onCambio={(v) => editarHueco(huecoSel, { alto: v })} />
              {huecoSel.tipo === 'ventana' && (
                <Num nombre="Antepecho" valor={huecoSel.base} min={0.05} max={10} onCambio={(v) => editarHueco(huecoSel, { base: v })} />
              )}
              <button className="peligro" onClick={borrar}>Borrar {huecoSel.tipo}</button>
            </div>
          )}
          {!muroSel && !huecoSel && (
            <div className="bloque">
              <h3>Muros nuevos</h3>
              <Num nombre="Grosor" valor={grosor} min={0.03} max={1} onCambio={setGrosor} />
              <Num nombre="Altura" valor={alto} min={0.3} max={20} onCambio={setAlto} />
              <button
                disabled={!plano.muros.length}
                onClick={() => cambiar({ ...plano, muros: plano.muros.map((m) => ({ ...m, alto })) })}
              >
                Aplicar altura a todos
              </button>
            </div>
          )}

          {plano.fondo && (
            <div className="bloque">
              <h3>Plano de fondo</h3>
              <label className="campo">
                <span>Opacidad</span>
                <input
                  type="range" min={0} max={1} step={0.05} value={plano.fondo.opacidad}
                  onChange={(e) => hist.reemplazar({ ...plano, fondo: { ...plano.fondo!, opacidad: Number(e.target.value) } })}
                />
              </label>
              <p className={plano.fondo.calibrado ? 'nota' : 'nota alerta'}>
                {plano.fondo.calibrado
                  ? `Escala ajustada: el plano mide ${(plano.fondo.w / plano.fondo.ppm).toFixed(1)} × ${(plano.fondo.h / plano.fondo.ppm).toFixed(1)} m.`
                  : 'Escala sin ajustar. Usa la herramienta Escala para que las medidas sean reales.'}
              </p>
              <button onClick={() => cambiar({ ...plano, fondo: null })}>Quitar fondo</button>
            </div>
          )}

          <div className="bloque resumen">
            <h3>Resumen</h3>
            <p><span>Muros</span><b>{plano.muros.length}</b></p>
            <p><span>Puertas</span><b>{plano.huecos.filter((h) => h.tipo === 'puerta').length}</b></p>
            <p><span>Ventanas</span><b>{plano.huecos.filter((h) => h.tipo === 'ventana').length}</b></p>
            <p><span>Habitaciones</span><b>{cuartos.length}</b></p>
            <p><span>Area interior</span><b>{areaTotal.toFixed(1)} m²</b></p>
          </div>
        </aside>
      </div>

      <footer className={'estado' + (aviso?.error ? ' error' : '')}>
        {ocupado ? <><i className="giro" />{ocupado}</> : aviso?.texto ?? HERRAMIENTAS.find((h) => h.id === herramienta)!.ayuda}
      </footer>
    </div>
  );
}
