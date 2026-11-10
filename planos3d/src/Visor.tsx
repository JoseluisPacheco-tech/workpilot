import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Cuarto } from './cuartos';
import { construirModelo, liberar } from './escena';
import { Plano } from './modelo';

type Props = { plano: Plano; cuartos: Cuarto[]; encuadre: number };

type Motor = {
  renderer: THREE.WebGLRenderer;
  escena: THREE.Scene;
  camara: THREE.PerspectiveCamera;
  controles: OrbitControls;
  sol: THREE.DirectionalLight;
  modelo: THREE.Group | null;
  radio: number;
};

export default function Visor({ plano, cuartos, encuadre }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const motor = useRef<Motor | null>(null);

  const encuadrar = () => {
    const m = motor.current;
    if (!m?.modelo) return;
    const limites = new THREE.Box3().setFromObject(m.modelo);
    if (limites.isEmpty()) return;
    const centro = limites.getCenter(new THREE.Vector3());
    const radio = Math.max(limites.getSize(new THREE.Vector3()).length() / 2, 2);
    // Distancia para que la esfera que envuelve al modelo quepa en el lado mas angosto.
    const vertical = THREE.MathUtils.degToRad(m.camara.fov) / 2;
    const horizontal = Math.atan(Math.tan(vertical) * m.camara.aspect);
    m.radio = radio;
    const lejos = (radio / Math.sin(Math.min(vertical, horizontal))) * 1.05;
    const dir = new THREE.Vector3(0.45, 0.7, 0.6).normalize();
    m.controles.target.copy(centro);
    m.camara.position.copy(centro).addScaledVector(dir, lejos);
    m.camara.near = lejos / 200;
    m.camara.far = lejos * 20;
    m.camara.updateProjectionMatrix();
    m.controles.update();
  };

  useEffect(() => {
    const el = caja.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const escena = new THREE.Scene();
    escena.background = new THREE.Color(0x1a1f29);
    escena.add(new THREE.HemisphereLight(0xffffff, 0x4a4f5a, 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 2);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    escena.add(sol, sol.target);

    const suelo = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x2a303c, roughness: 1 }),
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -0.01;
    suelo.receiveShadow = true;
    const rejilla = new THREE.GridHelper(200, 200, 0x3d4658, 0x323a49);
    escena.add(suelo, rejilla);

    const camara = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camara.position.set(10, 12, 14);
    const controles = new OrbitControls(camara, renderer.domElement);
    controles.enableDamping = true;
    controles.maxPolarAngle = Math.PI / 2 - 0.02;

    motor.current = { renderer, escena, camara, controles, sol, modelo: null, radio: 0 };

    const ajustar = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    ajustar();

    let cuadro = 0;
    const pintar = () => {
      cuadro = requestAnimationFrame(pintar);
      controles.update();
      renderer.render(escena, camara);
    };
    pintar();

    return () => {
      cancelAnimationFrame(cuadro);
      obs.disconnect();
      controles.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      motor.current = null;
    };
  }, []);

  useEffect(() => {
    const m = motor.current;
    if (!m) return;
    if (m.modelo) {
      m.escena.remove(m.modelo);
      liberar(m.modelo);
    }
    m.modelo = construirModelo(plano, cuartos);
    m.escena.add(m.modelo);

    const limites = new THREE.Box3().setFromObject(m.modelo);
    if (!limites.isEmpty()) {
      const c = limites.getCenter(new THREE.Vector3());
      const r = Math.max(limites.getSize(new THREE.Vector3()).length(), 6);
      m.sol.position.set(c.x + r * 0.5, r, c.z + r * 0.3);
      m.sol.target.position.copy(c);
      const cam = m.sol.shadow.camera;
      cam.left = cam.bottom = -r;
      cam.right = cam.top = r;
      cam.far = r * 4;
      cam.updateProjectionMatrix();
    }

    // La camara se reencuadra sola cuando el modelo cambia mucho de tamano.
    const radio = limites.isEmpty() ? 0 : limites.getSize(new THREE.Vector3()).length() / 2;
    if (radio && (!m.radio || radio > m.radio * 1.25 || radio < m.radio * 0.6)) encuadrar();
    if (!radio) m.radio = 0;
  }, [plano.muros, plano.huecos, cuartos]);

  useEffect(() => {
    encuadrar();
  }, [encuadre]);

  return <div ref={caja} className="visor" />;
}
