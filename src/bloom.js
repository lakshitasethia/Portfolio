// A procedural 3D peony, rendered twice: solid in the paper layer and as a
// wireframe in the machine layer, so the cursor lens shows its mesh.
// `state.open` (0–1) and `state.spin` are driven by ScrollTrigger in main.js.

import gsap from "gsap";
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Group,
  MeshStandardMaterial, MeshBasicMaterial, PlaneGeometry, Color, Float32BufferAttribute,
  Mesh, InstancedMesh, SphereGeometry, Matrix4, CylinderGeometry, DoubleSide, SRGBColorSpace,
} from "three";

const THREE = {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Group,
  MeshStandardMaterial, MeshBasicMaterial, PlaneGeometry, Color, Float32BufferAttribute,
  Mesh, InstancedMesh, SphereGeometry, Matrix4, CylinderGeometry, DoubleSide, SRGBColorSpace,
};

export function createBloom(section, state) {
  const stages = [...section.querySelectorAll(".about__stage")]; // [human, machine]
  // Two WebGL canvases (solid + wireframe) at retina resolution was the most
  // expensive thing on the page. Cap the pixel ratio and only antialias the
  // solid one; the wireframe only shows inside the lens anyway.
  const dpr = Math.min(devicePixelRatio, 1.5);
  const renderers = stages.map((stage, i) => {
    const canvas = document.createElement("canvas");
    stage.appendChild(canvas);
    const r = new THREE.WebGLRenderer({ canvas, antialias: i === 0, alpha: true, powerPreference: "high-performance" });
    r.setPixelRatio(i === 0 ? dpr : Math.min(dpr, 1.25));
    r.outputColorSpace = THREE.SRGBColorSpace;
    return r;
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 5.2, 5.6);
  camera.lookAt(0, 0.35, 0);

  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x7a5a48, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf0c89a, 1.2);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const flower = new THREE.Group();
  scene.add(flower);

  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.82 });
  const wire = new THREE.MeshBasicMaterial({ color: 0xf3e4d2, wireframe: true, transparent: true, opacity: 0.6 });

  function petalGeo(len, wid, cup, baseHex, tipHex) {
    const g = new THREE.PlaneGeometry(wid, len, 10, 14);
    g.translate(0, len / 2, 0);
    const p = g.attributes.position;
    const base = new THREE.Color(baseHex);
    const tip = new THREE.Color(tipHex);
    const c = new THREE.Color();
    const colors = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const t = y / len;
      const wf = Math.pow(Math.sin(Math.PI * (0.05 + t * 0.9)), 0.7) * (0.3 + 0.7 * Math.min(1, t * 4));
      const nx = x * wf;
      const u = nx / (wid / 2);
      const z = -cup * u * u * (0.3 + t) + 0.2 * t * t * t * len;
      p.setXYZ(i, nx, y, z);
      c.copy(base).lerp(tip, Math.pow(t, 1.4));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }

  // outer → inner; inner layers open later
  const layers = [
    { n: 12, len: 1.75, wid: 1.25, cup: 0.35, r: 0.18, closed: 0.38, open: 1.42, delay: 0, base: "#f6dccd", tip: "#e08d74" },
    { n: 9, len: 1.45, wid: 1.05, cup: 0.38, r: 0.12, closed: 0.22, open: 1.02, delay: 0.15, base: "#f3c9b6", tip: "#c9624a" },
    { n: 6, len: 1.1, wid: 0.8, cup: 0.42, r: 0.06, closed: 0.1, open: 0.62, delay: 0.3, base: "#e9a48c", tip: "#9e452a" },
  ];
  const petals = [];
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      const s = 0.9 + Math.random() * 0.18;
      const geo = petalGeo(L.len * s, L.wid * s, L.cup, L.base, L.tip);
      const pivot = new THREE.Group();
      pivot.rotation.y = (i / L.n) * Math.PI * 2 + li * 0.4;
      const mesh = new THREE.Mesh(geo, solid);
      mesh.position.z = L.r;
      pivot.add(mesh);
      flower.add(pivot);
      petals.push({ mesh, closed: L.closed, open: L.open + (Math.random() - 0.5) * 0.12, delay: L.delay, phase: Math.random() * 6 });
    }
  });

  // sepals
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 5) * Math.PI * 2 + 0.3;
    const m = new THREE.Mesh(petalGeo(1.25, 0.5, 0.15, "#4f6149", "#8c9c7f"), solid);
    m.position.set(0, -0.05, 0.1);
    m.rotation.x = 1.75;
    pivot.add(m);
    flower.add(pivot);
  }

  // stamens
  const gold = new THREE.MeshStandardMaterial({ color: 0xcf9844, roughness: 0.5, metalness: 0.2 });
  const stamens = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), gold, 70);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 70; i++) {
    const a = i * 2.39996;
    const r = 0.3 * Math.sqrt(i / 70);
    m4.makeTranslation(Math.cos(a) * r, 0.32 - r * 0.5, Math.sin(a) * r);
    stamens.setMatrixAt(i, m4);
  }
  const heart = new THREE.Group();
  heart.add(stamens);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), gold);
  core.position.y = 0.2;
  heart.add(core);
  flower.add(heart);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x55664d, roughness: 0.9 })
  );
  stem.position.y = -2;
  flower.add(stem);

  function resize() {
    const w = stages[0].clientWidth;
    const h = stages[0].clientHeight;
    if (!w || !h) return;
    renderers.forEach((r) => r.setSize(w, h, false));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stages[0]);
  resize();

  // Compile both shader variants now rather than on the first visible frame.
  renderers[0].compile(scene, camera);
  scene.overrideMaterial = wire;
  renderers[1].compile(scene, camera);
  scene.overrideMaterial = null;

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(section);

  const ease = (t) => t * t * (3 - 2 * t);
  let open = state.open;
  let tiltX = 0;
  let tiltZ = 0;
  let wireDrawn = false;

  gsap.ticker.add((t) => {
    if (!visible) return;
    open += (state.open - open) * 0.25;
    for (const p of petals) {
      const lo = Math.min(1, Math.max(0, (open - p.delay) / (1 - p.delay)));
      p.mesh.rotation.x = p.closed + (p.open - p.closed) * ease(lo) + Math.sin(t * 1.3 + p.phase) * 0.02;
    }
    heart.scale.setScalar(0.6 + open * 0.5);
    flower.rotation.y = t * 0.18 + state.spin;
    tiltX += (state.my * 0.25 - tiltX) * 0.06;
    tiltZ += (-state.mx * 0.25 - tiltZ) * 0.06;
    flower.rotation.x = tiltX;
    flower.rotation.z = tiltZ;

    scene.overrideMaterial = null;
    renderers[0].render(scene, camera);
    // The wireframe copy is only seen through the lens; skip it otherwise.
    if (section._lensOn) {
      scene.overrideMaterial = wire;
      renderers[1].render(scene, camera);
      wireDrawn = true;
    } else if (wireDrawn) {
      renderers[1].clear();
      wireDrawn = false;
    }
  });
}
