// Cedula de Evaluacion del Inmueble (IMSS, modelo de 8 salas de atencion, VCU).
// El catalogo y los umbrales salen del formato oficial: capacidades maximas por
// sala, puertas de salas de 0.90 m, pasillos y salida de emergencia de 1.20 m.

import { Cuarto } from './cuartos';
import { Local, Plano, Punto, areaPoligono, dentroDe, proyectar, tramoHueco, truncar } from './modelo';

export type Seccion = 'salas' | 'sum' | 'II' | 'III' | 'IV' | 'otros';

export type Entrada = {
  clave: string;
  nombre: string;
  seccion: Seccion;
  max?: number; // capacidad maxima normada de la sala
  patron?: RegExp; // reconoce el rotulo del plano (texto en mayusculas, sin signos ni espacios)
  fila?: string; // como empieza su renglon en la cedula impresa
};

export const CATALOGO: Entrada[] = [
  { clave: 'sumLactABC', nombre: 'SUM Lactantes A, B y C', seccion: 'sum', patron: /USOSMULTIPLES.*LACTANTESABYC|LACTANTESABYC.*USOSMULTIPLES/, fila: 'SALA DE USOS MULTIPLES LACTANTES A, B Y C' },
  { clave: 'sumLactAB', nombre: 'SUM Lactantes A y B', seccion: 'sum', patron: /USOSMULTIPLES.*LACTANTESAY?B|LACTANTESAY?B.*USOSMULTIPLES/, fila: 'SALA DE USOS MULTIPLES LACTANTES A Y B' },
  { clave: 'sumLactC', nombre: 'SUM Lactantes C', seccion: 'sum', patron: /USOSMULTIPLES.*LACTANTESC|LACTANTESC.*USOSMULTIPLES/, fila: 'SALA DE USOS MULTIPLES LACTANTES C' },
  { clave: 'sumLactA', nombre: 'SUM Lactantes A', seccion: 'sum', patron: /USOSMULTIPLES.*LACTANTESA|LACTANTESA.*USOSMULTIPLES/, fila: 'SALA DE USOS MULTIPLES LACTANTES A' },
  { clave: 'sumLactB', nombre: 'SUM Lactantes B', seccion: 'sum', patron: /USOSMULTIPLES.*LACTANTESB|LACTANTESB.*USOSMULTIPLES/, fila: 'SALA DE USOS MULTIPLES LACTANTES B' },
  { clave: 'sumMat1T', nombre: 'SUM Maternales A, B y C (1T)', seccion: 'sum', patron: /USOSMULTIPLES.*1TIEMPO|1TIEMPO.*USOSMULTIPLES/, fila: 'SALA DE USOS MULTIPLES MATERNALES A, B Y C' },
  { clave: 'sumMat2T', nombre: 'SUM Maternales A, B (2T)', seccion: 'sum', patron: /USOSMULTIPLES.*MATERNAL|MATERNAL.*USOSMULTIPLES|^SALADEUSOSMULTIPLES$|^USOSMULTIPLES$/, fila: 'SALA DE USOS MULTIPLES MATERNALES A, B (2T)' },

  { clave: 'lactAB', nombre: 'Lactantes A-B (fusionada)', seccion: 'salas', max: 24, patron: /LACTANTESAB/, fila: 'LACTANTES A-B' },
  { clave: 'matB12', nombre: 'Maternal B1-B2 (fusionada)', seccion: 'salas', max: 36, patron: /MATERNAL(ES)?B1B2/, fila: 'MATERNAL B1-B2' },
  { clave: 'matC12', nombre: 'Maternal C1-C2 (fusionada)', seccion: 'salas', max: 36, patron: /MATERNAL(ES)?C1C2/, fila: 'MATERNAL C1-C2' },
  { clave: 'lactA', nombre: 'Lactantes A', seccion: 'salas', max: 24, patron: /LACTANTESA/, fila: 'LACTANTES A' },
  { clave: 'lactB', nombre: 'Lactantes B', seccion: 'salas', max: 24, patron: /LACTANTESB/, fila: 'LACTANTES B' },
  { clave: 'lactC', nombre: 'Lactantes C', seccion: 'salas', max: 30, patron: /LACTANTESC/, fila: 'LACTANTES C' },
  { clave: 'matA', nombre: 'Maternal A', seccion: 'salas', max: 30, patron: /MATERNAL(ES)?A/, fila: 'MATERNAL A' },
  { clave: 'matB1', nombre: 'Maternal B1', seccion: 'salas', max: 36, patron: /MATERNAL(ES)?B1/, fila: 'MATERNAL B1' },
  { clave: 'matB2', nombre: 'Maternal B2', seccion: 'salas', max: 36, patron: /MATERNAL(ES)?B2/, fila: 'MATERNAL B2' },
  { clave: 'matC1', nombre: 'Maternal C1', seccion: 'salas', max: 36, patron: /MATERNAL(ES)?C1/, fila: 'MATERNAL C1' },
  { clave: 'matC2', nombre: 'Maternal C2', seccion: 'salas', max: 36, patron: /MATERNAL(ES)?C2/, fila: 'MATERNAL C2' },

  { clave: 'recepcion', nombre: 'Recepcion y control', seccion: 'II', patron: /RECEPCION|VESTIBULO.*CONTROL|CONTROL.*VESTIBULO|^FILTRO$/, fila: 'RECEPCION Y CONTROL' },
  { clave: 'sanFomento', nombre: 'Sanitario de fomento a la salud', seccion: 'III', patron: /SANITARIO.*FOMENTO|FOMENTO.*SANITARIO/, fila: 'SANITARIO DE FOMENTO' },
  { clave: 'fomento', nombre: 'Fomento a la salud', seccion: 'II', patron: /FOMENTO/, fila: 'FOMENTO A LA SALUD' },
  { clave: 'cocina', nombre: 'Cocina', seccion: 'II', patron: /COCINA/, fila: 'COCINA' },
  { clave: 'labLeches', nombre: 'Laboratorio de leches', seccion: 'II', patron: /LECHES/, fila: 'LABORATORIO DE LECHES' },
  { clave: 'viveres', nombre: 'Almacen de viveres', seccion: 'II', patron: /VIVERES/, fila: 'ALMACEN DE VIVERES' },
  { clave: 'esfinteres', nombre: 'Control de esfinteres', seccion: 'II', patron: /ESFINTERES/, fila: 'CONTROL DE ESFINTERES' },
  { clave: 'sanNinos', nombre: 'Sanitarios para ninos y ninas', seccion: 'II', patron: /SANITARIOSINFANTILES|SANITARIOSNIN/ },

  { clave: 'sanFamiliar', nombre: 'Sanitario familiar', seccion: 'III', patron: /FAMILIAR/, fila: 'SANITARIO FAMILIAR' },
  { clave: 'bodega', nombre: 'Bodega general', seccion: 'III', patron: /BODEGA/, fila: 'BODEGA GENERAL' },
  { clave: 'septicoPB', nombre: 'Septico planta baja', seccion: 'III', patron: /SEPTICO1|SEPTICO(PLANTA)?BAJA|SEPTICOPB/, fila: 'SEPTICO PLANTA BAJA' },
  { clave: 'septicoPA', nombre: 'Septico planta alta', seccion: 'III', patron: /SEPTICO2|SEPTICO(PLANTA)?ALTA|SEPTICOPA/, fila: 'SEPTICO PLANTA ALTA' },
  { clave: 'sanDireccion', nombre: 'Sanitario de direccion', seccion: 'III', patron: /SANITARIO.*DIRECCION|DIRECCION.*SANITARIO/, fila: 'SANITARIO DE DIRECCION' },
  { clave: 'direccion', nombre: 'Direccion', seccion: 'III', patron: /DIRECCION/, fila: 'DIRECCION' },
  { clave: 'sanPersonal', nombre: 'Sanitarios y vestidores de personal', seccion: 'III', patron: /VESTIDOR|LOCKER|BANODE|PERSONALBANO|SANITARIOS?(DE)?PERSONAL/, fila: 'SANITARIOS Y VESTIDORES DE PERSONAL' },
  { clave: 'descanso', nombre: 'Descanso de personal', seccion: 'III', patron: /DESCANSO/, fila: 'DESCANSO DE PERSONAL' },
  { clave: 'ropaLimpia', nombre: 'Area de ropa limpia', seccion: 'III', patron: /ROPALIM/, fila: 'AREA DE ROPA LIMPIA' },
  { clave: 'ropaSucia', nombre: 'Ropa sucia y/o lavanderia', seccion: 'III', patron: /ROPASUCIA|LAVAND/, fila: 'ROPA SUCIA' },
  { clave: 'patioServicio', nombre: 'Patio de servicio', seccion: 'III', patron: /PATIODESERVICIO/, fila: 'PATIO DE SERVICIO' },
  { clave: 'basura', nombre: 'Deposito de basura', seccion: 'III', patron: /BASURA/, fila: 'DEPOSITO DE BASURA' },
  { clave: 'acceso', nombre: 'Zona de acceso', seccion: 'III', patron: /PLAZADEACCESO|ZONADEACCESO|^ACCESO/, fila: 'ZONA DE ACCESO' },

  { clave: 'pedagogia', nombre: 'Pedagogia', seccion: 'IV', patron: /PEDAGOGIA/, fila: 'PEDAGOGIA' },
  { clave: 'lactancia', nombre: 'Sala de lactancia', seccion: 'IV', patron: /SALADELACTANCIA|LACTARIO/, fila: 'SALA DE LACTANCIA' },

  { clave: 'juegos', nombre: 'Area de juegos', seccion: 'otros', patron: /JUEGOS|PATIOCIVICO/ },
];

export const SECCIONES: { id: Seccion; titulo: string }[] = [
  { id: 'salas', titulo: 'II. Salas de atencion' },
  { id: 'sum', titulo: 'II. Salas de usos multiples' },
  { id: 'II', titulo: 'II. Espacios indispensables' },
  { id: 'III', titulo: 'III. Espacios necesarios para la operacion' },
  { id: 'IV', titulo: 'IV. Transicion a modelo MECI' },
  { id: 'otros', titulo: 'Areas exteriores' },
];

export const entrada = (clave: string) => CATALOGO.find((e) => e.clave === clave);

export const normalizar = (t: string) =>
  t.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');

// Capacidad escrita en el rotulo de una sala ("24 NIÑOS").
export const capacidadDeTexto = (texto: string) => {
  const m = /(\d+)\s*NI[ÑN]OS/i.exec(texto);
  return m ? Number(m[1]) : undefined;
};

// Decide a que local de la cedula corresponde un rotulo del plano.
export function claveDeTexto(texto: string): string {
  const n = normalizar(texto.replace(/\d+\s*NI[ÑN]OS/gi, ' '));
  if (!n) return '';
  return CATALOGO.find((e) => e.patron?.test(n))?.clave ?? '';
}

export const REQUISITOS: { id: string; texto: string }[] = [
  { id: 'r1', texto: 'El servicio de salas de atencion se otorga solo en planta baja o maximo en planta alta' },
  { id: 'r2', texto: 'Con salas en planta alta, hay al menos dos vias de descenso para evacuacion (2 escaleras o escalera y/o rampa)' },
  { id: 'r3', texto: 'Con salas en primer nivel, las escaleras cuentan con pasamanos' },
  { id: 'r4', texto: 'Pasillos y circulaciones usados como rutas de evacuacion con ancho minimo de 1.20 m constante' },
  { id: 'r5', texto: 'Al menos una salida de emergencia adicional a la entrada de uso comun, con vano minimo de 1.20 m' },
  { id: 'r6', texto: 'Todas las puertas de las salas de atencion tienen un ancho minimo de 0.90 m' },
  { id: 'r7', texto: 'El area de juegos esta en planta baja' },
  { id: 'r8', texto: 'El acceso al area de juegos esta despues de pasar por el filtro de la recepcion' },
  { id: 'r9', texto: 'El salon de usos multiples de maternales esta en planta baja, adjunto o cercano a la cocina' },
  { id: 'r10', texto: 'El inmueble se usa exclusivamente para el servicio de guarderia' },
];

export const SEGURIDAD: { id: string; texto: string }[] = [
  { id: 's1', texto: 'Circuito cerrado de television' },
  { id: 's2', texto: 'Sistema de alertamiento y alarma' },
  { id: 's3', texto: 'Iluminacion de emergencia' },
  { id: 's4', texto: 'Cables electricos fuera del alcance de los ninos o protegidos' },
  { id: 's5', texto: 'Sanitarios con piso antiderrapante o cintas antiderrapantes' },
  { id: 's6', texto: 'Camaras en salas, SUM, fomento, exterior de sanitarios, pasillos, juegos, vestibulo, perimetro y accesos' },
  { id: 's7', texto: 'Detectores de incendio' },
  { id: 's8', texto: 'Vidrios y espejos con pelicula anti-estallante o de seguridad' },
  { id: 's9', texto: 'Repisas, estantes y muebles con riesgo de volteo fijos de manera segura' },
  { id: 's10', texto: 'El abatimiento de las puertas no obstaculiza la ruta de evacuacion o abate 180 grados' },
  { id: 's11', texto: 'Mobiliario libre de astillas, clavos, tornillos sobresalientes o partes sueltas' },
];

const cuartoDe = (l: Local, cuartos: Cuarto[]) => cuartos.find((c) => dentroDe(l.punto, c.puntos));

export function contorno(l: Local, cuartos: Cuarto[]): Punto[] | null {
  return l.poligono ?? cuartoDe(l, cuartos)?.interior ?? null;
}

// Area util de un local, truncada a dos decimales como en la cedula.
export function areaLocal(l: Local, cuartos: Cuarto[]) {
  const c = contorno(l, cuartos);
  return c ? truncar(Math.abs(areaPoligono(c))) : 0;
}

// Ancho del vano de puerta mas angosto del local (capturado o medido en el plano).
export function vanoLocal(l: Local, plano: Plano, cuartos: Cuarto[]): number | null {
  if (l.vano) return l.vano;
  const borde = l.poligono ?? cuartoDe(l, cuartos)?.puntos;
  if (!borde) return null;
  const tol = l.poligono ? 0.4 : 0.1;
  let min: number | null = null;
  for (const h of plano.huecos) {
    if (h.tipo !== 'puerta') continue;
    const m = plano.muros.find((w) => w.id === h.muro);
    if (!m) continue;
    const c = tramoHueco(h, m).c;
    const cerca = borde.some((p, i) => proyectar(c, p, borde[(i + 1) % borde.length]).d < tol);
    if (cerca && (min === null || h.ancho < min)) min = h.ancho;
  }
  return min;
}

export type Fila = {
  e: Entrada;
  locales: Local[];
  nivel: string;
  area: number;
  capacidad: number;
  vano: number | null;
  vent: string;
  ilum: string;
  declArea?: number;
  declCap?: number;
  declVano?: number;
};

export type Hallazgo = { tipo: 'error' | 'aviso' | 'dato'; texto: string };

export type Evaluacion = {
  filas: Fila[];
  sinAsignar: Local[];
  capacidad: number;
  hallazgos: Hallazgo[];
  auto: Record<string, string>;
};

const TOL_AREA = 0.02;

export function evaluar(plano: Plano, cuartos: Cuarto[]): Evaluacion {
  const d = plano.cedula.declarado;
  const filas: Fila[] = CATALOGO.map((e) => {
    const locales = plano.locales.filter((l) => l.clave === e.clave);
    const vanos = locales.map((l) => vanoLocal(l, plano, cuartos)).filter((v): v is number => v !== null);
    const unico = (vs: (string | undefined)[]) => [...new Set(vs.filter(Boolean))].join(' / ');
    return {
      e,
      locales,
      nivel: unico(locales.map((l) => l.nivel)),
      area: truncar(locales.reduce((s, l) => s + areaLocal(l, cuartos), 0)),
      capacidad: locales.reduce((s, l) => s + (l.capacidad ?? 0), 0),
      vano: vanos.length ? Math.min(...vanos) : null,
      vent: unico(locales.map((l) => l.vent)),
      ilum: unico(locales.map((l) => l.ilum)),
      declArea: d['area:' + e.clave],
      declCap: d['cap:' + e.clave],
      declVano: d['vano:' + e.clave],
    };
  });

  const h: Hallazgo[] = [];
  const salas = filas.filter((f) => f.e.seccion === 'salas');
  const capDe = (f: Fila) => f.capacidad || f.declCap || 0;
  const capacidad = salas.reduce((s, f) => s + capDe(f), 0);

  for (const f of filas) {
    const n = f.e.nombre;
    const existe = f.locales.length > 0;
    if (f.e.max && capDe(f) > f.e.max) {
      h.push({ tipo: 'error', texto: `${n}: la capacidad propuesta (${capDe(f)}) rebasa el maximo normado de ${f.e.max}; la sala tendria puntaje 0.` });
    }
    const vano = f.vano ?? f.declVano ?? null;
    if (f.e.seccion === 'salas' && vano !== null && vano > 0 && vano < 0.9) {
      h.push({ tipo: 'error', texto: `${n}: el vano de puerta mide ${vano.toFixed(2)} m y el minimo obligatorio es 0.90 m.` });
    }
    if (f.declArea !== undefined && f.declArea > 0 && existe && Math.abs(f.declArea - f.area) > TOL_AREA) {
      const dif = f.area - f.declArea;
      h.push({
        tipo: Math.abs(dif) > 0.5 ? 'error' : 'aviso',
        texto: `${n}: la cedula declara ${f.declArea.toFixed(2)} m² y en el plano se miden ${f.area.toFixed(2)} m² (${dif > 0 ? '+' : ''}${dif.toFixed(2)}).`,
      });
    }
    if (f.declArea !== undefined && f.declArea > 0 && !existe) {
      h.push({ tipo: 'aviso', texto: `${n}: la cedula declara ${f.declArea.toFixed(2)} m² pero no hay un local marcado en el plano.` });
    }
    if (existe && f.declArea === 0 && f.area > 0 && Object.keys(d).length) {
      h.push({ tipo: 'aviso', texto: `${n}: existe en el plano (${f.area.toFixed(2)} m²) pero la cedula lo deja en 0.00.` });
    }
    if (f.vano !== null && f.declVano && Math.abs(f.vano - f.declVano) > 0.03) {
      h.push({ tipo: 'aviso', texto: `${n}: la cedula declara un vano de ${f.declVano.toFixed(2)} m y en el plano mide ${f.vano.toFixed(2)} m.` });
    }
    if (f.e.seccion === 'salas' && existe && capDe(f) > 0) {
      h.push({ tipo: 'dato', texto: `${n}: ${f.area.toFixed(2)} m² para ${capDe(f)} ninos = ${(f.area / capDe(f)).toFixed(2)} m² por nino.` });
    }
  }
  const faltan = salas.filter((f) => !f.locales.length && !f.declArea && !/fusionada/.test(f.e.nombre));
  if (plano.locales.length && faltan.length) {
    h.push({ tipo: 'aviso', texto: `Salas sin marcar en el plano: ${faltan.map((f) => f.e.nombre).join(', ')}.` });
  }

  // Respuestas que se pueden deducir del plano.
  const auto: Record<string, string> = {};
  const niveles = new Set(salas.flatMap((f) => f.locales.map((l) => l.nivel)));
  if (niveles.size) {
    auto.u1 = niveles.has('PB') && !niveles.has('PA') ? 'SI' : 'NO';
    auto.u2 = niveles.has('PA') && !niveles.has('PB') ? 'SI' : 'NO';
    auto.u3 = niveles.has('PA') && niveles.has('PB') ? 'SI' : 'NO';
    auto.r1 = 'SI';
  }
  const vanos = salas.filter((f) => f.locales.length || f.declVano).map((f) => f.vano ?? f.declVano ?? null);
  if (vanos.length && vanos.every((v) => v !== null)) auto.r6 = vanos.every((v) => v! >= 0.9) ? 'SI' : 'NO';
  const juegos = filas.find((f) => f.e.clave === 'juegos')!;
  if (juegos.locales.length) auto.r7 = juegos.locales.every((l) => l.nivel === 'PB') ? 'SI' : 'NO';

  const r = plano.cedula.respuestas;
  for (const k of ['u1', 'u2', 'u3'] as const) {
    if (r[k] && auto[k] && r[k] !== auto[k]) {
      const pregunta = { u1: 'solo en planta baja', u2: 'solo en planta alta', u3: 'en planta baja y planta alta' }[k];
      h.push({ tipo: 'aviso', texto: `Ubicacion de salas "${pregunta}": la cedula responde ${r[k]} y segun los locales marcados es ${auto[k]}.` });
    }
  }
  for (const q of REQUISITOS) {
    const valor = r[q.id] || auto[q.id];
    if (valor === 'NO') h.push({ tipo: 'error', texto: `Requisito obligatorio no cumplido: ${q.texto}. Es motivo de desechamiento.` });
  }
  if (capacidad) h.unshift({ tipo: 'dato', texto: `Capacidad ofertada total: ${capacidad} ninos.` });

  const orden = { error: 0, aviso: 1, dato: 2 };
  h.sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  return { filas, sinAsignar: plano.locales.filter((l) => !entrada(l.clave)), capacidad, hallazgos: h, auto };
}

// Tabla de la evaluacion en CSV, lista para abrir en Excel.
export function aCsv(ev: Evaluacion, plano: Plano): string {
  const celda = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const n = (v: number | null | undefined) => (v ? v.toFixed(2) : '');
  const lineas = [['Seccion', 'Local', 'Existe', 'Nivel', 'Capacidad', 'Area medida m2', 'Area declarada m2', 'Diferencia', 'Vano m', 'Ventilacion', 'Iluminacion']];
  for (const s of SECCIONES) for (const f of ev.filas.filter((x) => x.e.seccion === s.id)) {
    const existe = f.locales.length > 0;
    lineas.push([
      s.titulo, f.e.nombre, existe ? 'SI' : 'NO', f.nivel, String(f.capacidad || f.declCap || ''), n(f.area), n(f.declArea),
      existe && f.declArea ? (f.area - f.declArea).toFixed(2) : '', n(f.vano ?? f.declVano), f.vent, f.ilum,
    ]);
  }
  lineas.push([], ['Requisito', 'Respuesta']);
  for (const q of [...REQUISITOS, ...SEGURIDAD]) lineas.push([q.texto, plano.cedula.respuestas[q.id] || ev.auto[q.id] || '']);
  lineas.push([], ['Hallazgo', 'Detalle']);
  for (const x of ev.hallazgos) lineas.push([x.tipo, x.texto]);
  return '﻿' + lineas.map((l) => l.map(celda).join(',')).join('\r\n');
}
