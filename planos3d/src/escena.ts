import * as THREE from 'three';
import { Cuarto } from './cuartos';
import { Hueco, Muro, Plano, largo, proyectar } from './modelo';

const matMuro = new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.9 });
const matPiso = new THREE.MeshStandardMaterial({ color: 0xb89b78, roughness: 0.8, side: THREE.DoubleSide });
const matVidrio = new THREE.MeshStandardMaterial({
  color: 0x9fd4f5, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide,
});
const matMarco = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.7 });

// Un extremo se alarga medio grosor cuando toca otro muro, para cerrar la esquina.
function tocaOtro(p: { x: number; y: number }, m: Muro, muros: Muro[]) {
  return muros.some((o) => o !== m && proyectar(p, o.a, o.b).d < 0.05);
}

function muro3d(m: Muro, huecos: Hueco[], muros: Muro[]) {
  const L = largo(m);
  const grupo = new THREE.Group();
  if (L < 0.02) return grupo;
  const H = m.alto;
  const ini = tocaOtro(m.a, m, muros) ? -m.grosor / 2 : 0;
  const fin = L + (tocaOtro(m.b, m, muros) ? m.grosor / 2 : 0);

  // Tramos de hueco ordenados y sin traslapes.
  const tramos: { h: Hueco; u0: number; u1: number }[] = [];
  for (const h of [...huecos].sort((p, q) => p.pos - q.pos)) {
    const c = h.pos * L;
    const u0 = Math.max(0.03, c - h.ancho / 2);
    const u1 = Math.min(L - 0.03, c + h.ancho / 2);
    const previo = tramos[tramos.length - 1];
    if (u1 - u0 < 0.1 || (previo && u0 < previo.u1 + 0.03)) continue;
    tramos.push({ h, u0, u1 });
  }

  // Perfil del muro visto de frente: u a lo largo, v hacia arriba.
  const perfil = new THREE.Shape();
  perfil.moveTo(ini, 0);
  for (const t of tramos) {
    if (t.h.base > 0.01) continue;
    const top = Math.min(t.h.alto, H - 0.05);
    perfil.lineTo(t.u0, 0);
    perfil.lineTo(t.u0, top);
    perfil.lineTo(t.u1, top);
    perfil.lineTo(t.u1, 0);
  }
  perfil.lineTo(fin, 0);
  perfil.lineTo(fin, H);
  perfil.lineTo(ini, H);
  perfil.closePath();

  for (const t of tramos) {
    if (t.h.base <= 0.01) continue;
    const v0 = Math.min(t.h.base, H - 0.2);
    const v1 = Math.min(t.h.base + t.h.alto, H - 0.05);
    if (v1 - v0 < 0.05) continue;
    const hoyo = new THREE.Path();
    hoyo.moveTo(t.u0, v0);
    hoyo.lineTo(t.u1, v0);
    hoyo.lineTo(t.u1, v1);
    hoyo.lineTo(t.u0, v1);
    hoyo.closePath();
    perfil.holes.push(hoyo);

    if (t.h.tipo === 'ventana') {
      const vidrio = new THREE.Mesh(new THREE.BoxGeometry(t.u1 - t.u0, v1 - v0, 0.02), matVidrio);
      vidrio.position.set((t.u0 + t.u1) / 2, (v0 + v1) / 2, 0);
      vidrio.name = 'vidrio';
      grupo.add(vidrio);
      const repisa = new THREE.Mesh(new THREE.BoxGeometry(t.u1 - t.u0, 0.04, m.grosor + 0.04), matMarco);
      repisa.position.set((t.u0 + t.u1) / 2, v0, 0);
      repisa.name = 'repisa';
      grupo.add(repisa);
    }
  }

  const geo = new THREE.ExtrudeGeometry(perfil, { depth: m.grosor, bevelEnabled: false });
  geo.translate(0, 0, -m.grosor / 2);
  const malla = new THREE.Mesh(geo, matMuro);
  malla.castShadow = true;
  malla.receiveShadow = true;
  malla.name = 'muro';
  grupo.add(malla);

  grupo.position.set(m.a.x, 0, m.a.y);
  grupo.rotation.y = -Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x);
  return grupo;
}

// Construye el modelo 3D completo. Unidades en metros, eje Y hacia arriba.
export function construirModelo(plano: Plano, cuartos: Cuarto[]) {
  const modelo = new THREE.Group();
  modelo.name = 'plano';

  for (const m of plano.muros) {
    modelo.add(muro3d(m, plano.huecos.filter((h) => h.muro === m.id), plano.muros));
  }

  for (const c of cuartos) {
    const forma = new THREE.Shape(c.puntos.map((p) => new THREE.Vector2(p.x, p.y)));
    const geo = new THREE.ShapeGeometry(forma);
    geo.rotateX(Math.PI / 2);
    const piso = new THREE.Mesh(geo, matPiso);
    piso.position.y = 0.005;
    piso.receiveShadow = true;
    piso.name = 'piso';
    modelo.add(piso);
  }

  modelo.updateMatrixWorld(true);
  return modelo;
}

export function liberar(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
