// Generative hero illustration: a watercolour garden on the left (paper),
// an ink-and-graphite constellation on the right (machine), reaching for each other.
// Everything is drawn twice — once into the human layer, once into the
// machine layer — so the lens shows the same picture as linework.

import gsap from "gsap";

const NS = "http://www.w3.org/2000/svg";
const C = {
  coral: "#c9624a", coral2: "#e08d74", blush: "#efb39f", sang: "#9e452a",
  gold: "#cf9844", gold2: "#e2b86c",
  sage: "#66785f", sage2: "#8c9c7f", sage3: "#4f6149",
  // the machine side is drawn in graphite and ink, with gold for the live parts
  blue: "#5e4b3f", blue2: "#8a7566", blue3: "#c9b6a4", indigo: "#2a201b", pale: "#f3e8dc",
};

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createHeroArt(hero) {
  const hosts = [...hero.querySelectorAll(".illo")]; // [human, machine]
  let ctx;
  let movers = [];
  const api = { parts: null, build };

  function build() {
    ctx && ctx.revert();
    hosts.forEach((h) => h.replaceChildren());
    const hr = hero.getBoundingClientRect();
    const name = hero.querySelector(".human .line--back").getBoundingClientRect();
    const portrait = hero.querySelector(".human .portrait").getBoundingClientRect();
    const foot = hero.querySelector(".human .hero__foot").getBoundingClientRect();
    const box = (r) => ({ l: r.left - hr.left, r: r.right - hr.left, t: r.top - hr.top, b: r.bottom - hr.top });
    const geo = {
      w: hero.clientWidth,
      h: hero.clientHeight,
      meet: [portrait.left + portrait.width / 2 - hr.left, portrait.top + portrait.height * 0.62 - hr.top],
      portrait: box(portrait),
      name: box(name),
      foot: box(foot),
    };
    ctx = gsap.context(() => {
      api.parts = draw(hosts, geo);
    });
    const P = api.parts;
    movers = [
      [P.svg.bio, 14, 9],
      [P.svg.os, 10, 7],
      [P.svg.fx, 22, 14],
    ].map(([els, ax, ay]) => ({
      x: gsap.quickTo(els, "x", { duration: 1.2, ease: "power3" }),
      y: gsap.quickTo(els, "y", { duration: 1.2, ease: "power3" }),
      ax, ay,
    }));
    return P;
  }

  if (!reduce) {
    addEventListener("pointermove", (e) => {
      const dx = e.clientX / innerWidth - 0.5;
      const dy = e.clientY / innerHeight - 0.5;
      movers.forEach((m) => {
        m.x(-dx * m.ax);
        m.y(-dy * m.ay);
      });
    }, { passive: true });
  }

  return api;
}

function draw(hosts, { w: W, h: H, meet, portrait, name, foot }) {
  const R = rng(11);
  const pick = (a) => a[(R() * a.length) | 0];
  const port = W < H * 0.9;

  // Make the same element in both layers; returns [human, machine].
  const mk = (tag, attrs, parents) =>
    parents.map((p) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      p.appendChild(e);
      return e;
    });
  const pt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

  const svg = (cls) => mk("svg", { class: `art art--${cls}`, viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, hosts);
  const S = { bio: svg("bio"), os: svg("os"), fx: svg("fx") };

  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `
    <filter id="wc" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="0.5"/>
    </filter>`;
  S.bio[0].prepend(defs);

  const bio = mk("g", { class: "paint", filter: "url(#wc)" }, S.bio);
  const os = mk("g", { class: "paint", filter: "url(#wc)" }, S.os);
  const fx = mk("g", {}, S.fx);

  const P = {
    svg: { bio: S.bio, os: S.os, fx: S.fx },
    stems: [], leaves: [], blooms: [], lines: [], nodes: [], cols: [],
    reach: [], joints: [], fxIn: [], halo: [],
  };
  const add = (k, els) => P[k].push(...els);

  /* ── the garden ─────────────────────────────────────── */

  function leaf(x, y, a, l, parent = bio) {
    const g = mk("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})` }, parent);
    const wd = l * (0.2 + R() * 0.12);
    mk("path", { d: `M0 0Q${l * 0.45} ${-wd} ${l} 0Q${l * 0.5} ${wd} 0 0Z`, fill: pick([C.sage, C.sage2, C.sage3, C.sage2]), class: "wash" }, g);
    mk("path", { d: `M0 0L${l * 0.85} 0`, class: "vein" }, g);
    add("leaves", g);
  }

  function bud(x, y, a) {
    const g = mk("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})` }, bio);
    mk("path", { d: "M0 0L14 0", class: "twig" }, g);
    mk("ellipse", { cx: 20, cy: 0, rx: 8, ry: 5.5, fill: pick([C.coral, C.coral2, C.sang]), class: "wash" }, g);
    mk("path", { d: "M12 0Q16 -6 20 -5M12 0Q16 6 20 5", class: "vein" }, g);
    add("leaves", g);
  }

  function flower(x, y, r) {
    const g = mk("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(R() * 360).toFixed(0)})` }, bio);
    const n = 7 + ((R() * 3) | 0);
    const outer = pick([C.coral2, C.blush, C.coral2]);
    for (let i = 0; i < n; i++)
      mk("ellipse", { cx: r * 0.55, cy: 0, rx: r * 0.52, ry: r * 0.36, fill: outer, transform: `rotate(${(i * 360) / n + R() * 12})`, class: "wash" }, g);
    const m = 5 + ((R() * 2) | 0);
    for (let i = 0; i < m; i++)
      mk("ellipse", { cx: r * 0.27, cy: 0, rx: r * 0.32, ry: r * 0.22, fill: pick([C.coral, C.sang, C.coral]), transform: `rotate(${(i * 360) / m + 20})`, class: "wash" }, g);
    mk("circle", { r: r * 0.2, fill: C.gold, class: "au wash" }, g);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      mk("circle", { cx: Math.cos(a) * r * 0.32, cy: Math.sin(a) * r * 0.32, r: Math.max(1.2, r * 0.035), fill: C.sang }, g);
    }
    add("blooms", g);
  }

  function stem(p0, c1, c2, p1, width, o = {}) {
    const d = `M${pt(p0)}C${pt(c1)} ${pt(c2)} ${pt(p1)}`;
    const path = mk("path", { d, class: "stem", "stroke-width": width }, bio);
    add(o.reach ? "reach" : "stems", path);
    const hp = path[0];
    const L = hp.getTotalLength();
    const at = (l) => {
      const a = hp.getPointAtLength(l);
      const b = hp.getPointAtLength(Math.min(L, l + 1));
      const c = l + 1 > L ? hp.getPointAtLength(l - 1) : a;
      const ang = l + 1 > L ? Math.atan2(a.y - c.y, a.x - c.x) : Math.atan2(b.y - a.y, b.x - a.x);
      return [a.x, a.y, (ang * 180) / Math.PI];
    };
    let side = 1;
    const scale = o.scale ?? 1;
    for (let l = o.start ?? 20; l < L - 30; l += (15 + R() * 15) * scale) {
      const [x, y, a] = at(l);
      const t = R();
      if (t < 0.74) {
        leaf(x, y, a + side * (30 + R() * 40), (26 + R() * 30) * scale * (1 - (l / L) * 0.3));
        side *= -1;
      } else if (t < 0.88) bud(x, y, a + side * 55);
      else if (o.flowers !== false) flower(x, y, (14 + R() * 16) * scale);
    }
    const [ex, ey, ea] = at(L);
    if (o.end !== false) flower(ex, ey, (o.endR ?? 28 + R() * 22) * scale);
    return { ex, ey, ea };
  }

  const k = port ? 0.75 : 1;
  stem([-0.02 * W, 1.02 * H], [0.1 * W, 0.8 * H], [0.04 * W, 0.56 * H], [0.19 * W, 0.44 * H], 4, { endR: 46, scale: k });
  stem([-0.02 * W, 0.3 * H], [0.08 * W, 0.24 * H], [0.12 * W, 0.1 * H], [0.27 * W, 0.07 * H], 3.5, { endR: 34, scale: k });
  stem([0.03 * W, 1.03 * H], [0.16 * W, 0.94 * H], [0.24 * W, 0.92 * H], [0.33 * W, 0.88 * H], 3, { endR: 30, scale: k });
  stem([-0.02 * W, 0.66 * H], [0.06 * W, 0.6 * H], [0.12 * W, 0.7 * H], [0.22 * W, 0.62 * H], 2.5, { endR: 26, scale: k });
  stem([-0.02 * W, 0.08 * H], [0.04 * W, 0.18 * H], [0.02 * W, 0.34 * H], [0.08 * W, 0.42 * H], 3, { endR: 52, scale: k });

  stem([0.1 * W, 1.03 * H], [0.14 * W, 0.84 * H], [0.26 * W, 0.8 * H], [0.3 * W, 0.68 * H], 2.2, { endR: 24, scale: k * 0.85 });
  stem([-0.02 * W, 0.46 * H], [0.08 * W, 0.42 * H], [0.1 * W, 0.3 * H], [0.18 * W, 0.24 * H], 2.4, { endR: 30, scale: k * 0.9 });

  // Big peony clusters anchoring the corners, like a painted border.
  function cluster(cx, cy, n, r0) {
    for (let i = 0; i < n * 2; i++) {
      const a = R() * Math.PI * 2;
      const d = r0 * (0.6 + R() * 1.1);
      leaf(cx + Math.cos(a) * d * 0.6, cy + Math.sin(a) * d * 0.6, (a * 180) / Math.PI, r0 * (0.7 + R() * 0.6));
    }
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2;
      const d = i === 0 ? 0 : r0 * (0.7 + R() * 0.8);
      flower(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r0 * (i === 0 ? 1 : 0.55 + R() * 0.35));
    }
  }
  cluster(0.03 * W, 0.94 * H, 4, 62 * k);
  cluster(0.0 * W, 0.5 * H, 3, 48 * k);
  cluster(0.0 * W, 0.2 * H, 3, 46 * k);
  cluster(0.2 * W, 1.0 * H, 2, 38 * k);

  // The reaching tendril, reaching in behind the portrait.
  const tip = [portrait.l + (portrait.r - portrait.l) * 0.16, meet[1]];
  stem([0.12 * W, 0.78 * H], [0.24 * W, 0.86 * H], [tip[0] - 0.14 * W, tip[1] + 0.06 * H], tip, 2.2, {
    reach: true, end: false, flowers: false, start: 30, scale: k * 0.8,
  });
  const curl = mk("path", { d: `M${pt(tip)}c6 -2 10 -8 6 -13c-3 -4 -9 -2 -8 3`, class: "stem", "stroke-width": 1.4 }, bio);
  add("reach", curl);

  /* ── the machine ────────────────────────────────────── */

  const inside = (x, y, b, pad) => x > b.l - pad && x < b.r + pad && y > b.t - pad && y < b.b + pad;
  const nodes = [];
  const cell = Math.max(64, Math.min(W, H) * 0.1);
  const x0 = port ? 0.62 * W : 0.6 * W;
  for (let y = H * 0.04; y < H * 1.02; y += cell)
    for (let x = x0; x < W * 1.02; x += cell) {
      if (R() < 0.32) continue;
      const px = x + (R() - 0.5) * cell * 0.8;
      const py = y + (R() - 0.5) * cell * 0.8;
      if (inside(px, py, name, 16) || inside(px, py, foot, 24) || inside(px, py, portrait, -40)) continue;
      nodes.push([px, py]);
    }

  const seen = new Set();
  const wires = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])])
      .filter(([j]) => j !== i)
      .sort((p, q) => p[1] - q[1])
      .slice(0, 2)
      .forEach(([j]) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        wires.push([a, nodes[j]]);
        add("lines", mk("line", { x1: a[0], y1: a[1], x2: nodes[j][0], y2: nodes[j][1], class: "wire" }, os));
      });
  });

  // Stained-glass columns at the right edge.
  const colN = port ? 3 : 6;
  for (let i = 0; i < colN; i++) {
    const cw = W * (0.012 + R() * 0.016) + 8;
    const cx = W - (i + 0.4) * (W * 0.022 + 10) - R() * 6;
    const fromTop = i % 3 === 1;
    const y0 = fromTop ? 64 : H * (0.25 + R() * 0.5);
    const y1 = fromTop ? H * (0.12 + R() * 0.25) : H + 10;
    const g = mk("g", {}, os);
    mk("rect", { x: cx, y: y0, width: cw, height: y1 - y0, fill: pick([C.blue, C.blue2, C.indigo, C.blue3]), opacity: 0.55 + R() * 0.3, class: "wash" }, g);
    for (let yy = y0 + 30; yy < y1 - 10; yy += 40 + R() * 50)
      mk("rect", { x: cx + 3, y: yy, width: cw - 6, height: 14 + R() * 18, fill: pick([C.pale, C.blue3, C.gold2]), opacity: 0.8, class: "wash" }, g);
    P.cols.push(...g);
  }

  nodes.forEach(([x, y], i) => {
    const r = 3 + R() * 5;
    const g = mk("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, os);
    if (i % 7 === 3) {
      const s = 12 + R() * 12;
      mk("rect", { x: -s / 2, y: -s / 2, width: s, height: s, fill: pick([C.blue3, C.blue, C.blue2]), transform: R() < 0.5 ? "rotate(45)" : "", class: "wash" }, g);
    } else {
      mk("circle", { r, fill: pick([C.blue, C.indigo, C.blue2, C.blue]), class: "wash" }, g);
      if (R() < 0.3) mk("circle", { r: r + 5, class: "ring" }, g);
    }
    add("nodes", g);
  });

  // Orbits
  const orbits = port
    ? [[0.8 * W, 0.16 * H, [40, 66, 94]], [0.84 * W, 0.86 * H, [36, 60]]]
    : [[0.8 * W, 0.27 * H, [52, 88, 128]], [0.87 * W, 0.76 * H, [42, 72]]];
  orbits.forEach(([ox, oy, radii]) => {
    radii.forEach((r) => add("lines", mk("circle", { cx: ox, cy: oy, r, class: "orbit" }, os)));
  });

  // The reaching arm: bones and joints, reaching in behind the portrait.
  const tipM = [portrait.r - (portrait.r - portrait.l) * 0.16, meet[1]];
  const joints = [
    [W + 12, 0.86 * H],
    [0.88 * W, 0.8 * H],
    [0.77 * W, 0.71 * H],
    [Math.max(tipM[0] + 60, 0.66 * W), meet[1] + 0.05 * H],
    tipM,
  ];
  const armD = `M${joints.map(pt).join("L")}`;
  add("reach", mk("path", { d: armD, class: "bone" }, os));
  add("reach", mk("path", { d: armD, class: "core" }, os));
  joints.slice(1).forEach(([x, y], i) => {
    const g = mk("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, os);
    mk("circle", { r: i === 3 ? 5 : 8, fill: C.pale, class: "joint" }, g);
    mk("circle", { r: 2.5, fill: C.gold, class: "au" }, g);
    add("joints", g);
  });

  /* ── moving things (no filter, so they stay cheap) ──── */


  function compass(x, y, r) {
    const outer = mk("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, fx);
    const spin = mk("g", {}, outer);
    mk("circle", { r: r * 1.15, class: "ring" }, spin);
    for (let i = 0; i < 8; i++)
      mk("path", { d: `M0 0Q${r * 0.4} ${-r * 0.2} ${r} 0Q${r * 0.4} ${r * 0.2} 0 0Z`, fill: C.blue3, transform: `rotate(${i * 45})`, class: "petal-m" }, spin);
    for (let i = 0; i < 8; i++)
      mk("path", { d: `M0 0Q${r * 0.25} ${-r * 0.12} ${r * 0.6} 0Q${r * 0.25} ${r * 0.12} 0 0Z`, fill: C.blue, transform: `rotate(${i * 45 + 22.5})`, class: "petal-m" }, spin);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mk("circle", { cx: Math.cos(a) * r * 1.15, cy: Math.sin(a) * r * 1.15, r: 1.8, fill: C.indigo }, spin);
    }
    mk("circle", { r: r * 0.2, fill: C.gold, class: "au" }, spin);
    mk("circle", { r: r * 0.2, class: "ring" }, spin);
    add("fxIn", outer);
    if (!reduce) gsap.to(spin, { rotation: 360, svgOrigin: "0 0", duration: 40 + R() * 30, repeat: -1, ease: "none" });
  }
  compass(orbits[0][0], orbits[0][1], port ? 26 : 34);
  compass(port ? 0.72 * W : 0.69 * W, port ? 0.42 * H : 0.5 * H, port ? 18 : 26);
  compass(port ? 0.9 * W : 0.67 * W, port ? 0.64 * H : 0.12 * H, port ? 16 : 22);

  // Satellites on the orbits
  orbits.forEach(([ox, oy, radii]) => {
    radii.forEach((r, i) => {
      const g = mk("g", { transform: `translate(${ox.toFixed(1)} ${oy.toFixed(1)})` }, fx);
      const spin = mk("g", {}, g);
      mk("circle", { cx: r, cy: 0, r: 4 - i * 0.6, fill: i % 2 ? C.gold : C.blue, class: i % 2 ? "au" : "" }, spin);
      add("fxIn", g);
      if (!reduce)
        gsap.fromTo(spin, { rotation: R() * 360 }, { rotation: "+=360", svgOrigin: "0 0", duration: 14 + i * 9, repeat: -1, ease: "none" });
    });
  });

  // Pulses along the wires
  if (!reduce)
    for (let i = 0; i < Math.min(7, wires.length); i++) {
      const [a, b] = wires[(R() * wires.length) | 0];
      const dot = mk("circle", { cx: a[0], cy: a[1], r: 2.4, fill: C.gold, class: "au" }, fx);
      gsap.to(dot, {
        attr: { cx: b[0], cy: b[1] },
        duration: 1.6 + R() * 2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: R() * 2,
      });
    }

  // Butterflies: one painted, two machined.
  function butterfly(x, y, s, kind) {
    const outer = mk("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s}) rotate(${kind === "bio" ? -18 : 14})` }, fx);
    const bob = mk("g", {}, outer);
    const wings = mk("g", {}, bob);
    const curvy = [[0, 0], [-6, -22], [-34, -34], [-36, -14], [-37, -2], [-18, 4], [0, 0]];
    const low = [[0, 2], [-14, 6], [-26, 22], [-14, 28], [-6, 30], [-2, 16], [0, 2]];
    const ang = [[0, 0], [-14, -27], [-36, -22], [-33, -5]];
    const angLow = [[0, 2], [-22, 10], [-15, 28]];
    for (const sg of [1, -1]) {
      const m = (p) => `${p[0] * sg},${p[1]}`;
      if (kind === "bio") {
        mk("path", { d: `M${m(curvy[0])}C${m(curvy[1])} ${m(curvy[2])} ${m(curvy[3])}C${m(curvy[4])} ${m(curvy[5])} ${m(curvy[6])}Z`, fill: C.gold2, class: "wash" }, wings);
        mk("path", { d: `M${m(low[0])}C${m(low[1])} ${m(low[2])} ${m(low[3])}C${m(low[4])} ${m(low[5])} ${m(low[6])}Z`, fill: C.coral, class: "wash" }, wings);
        mk("circle", { cx: -24 * sg, cy: -18, r: 3, fill: C.sang }, wings);
      } else {
        mk("path", { d: `M${ang.map(m).join("L")}Z`, fill: C.blue3, class: "mwing" }, wings);
        mk("path", { d: `M${angLow.map(m).join("L")}Z`, fill: C.blue2, class: "mwing" }, wings);
        mk("path", { d: `M0 0L${-30 * sg} -14M0 0L${-20 * sg} -26M0 2L${-17 * sg} 22`, class: "mvein" }, wings);
        mk("circle", { cx: -24 * sg, cy: -14, r: 2.6, fill: C.gold, class: "au" }, wings);
      }
    }
    mk("ellipse", { cx: 0, cy: 6, rx: 2.2, ry: 13, fill: kind === "bio" ? C.sang : C.indigo }, bob);
    add("fxIn", outer);
    if (!reduce) {
      gsap.to(wings, { scaleX: 0.28, transformOrigin: "50% 50%", duration: 0.16 + R() * 0.1, repeat: -1, yoyo: true, ease: "sine.inOut", repeatDelay: R() * 0.4 });
      gsap.to(bob, { x: (R() - 0.5) * 40, y: -14 - R() * 18, duration: 2.4 + R() * 2, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
  }
  butterfly(port ? 0.3 * W : 0.24 * W, port ? 0.1 * H : 0.12 * H, port ? 0.8 : 1.2, "bio");
  butterfly(port ? 0.12 * W : 0.3 * W, port ? 0.6 * H : 0.42 * H, port ? 0.5 : 0.7, "bio");
  butterfly(port ? 0.78 * W : 0.73 * W, port ? 0.3 * H : 0.17 * H, port ? 0.7 : 1, "os");
  butterfly(port ? 0.7 * W : 0.78 * W, port ? 0.74 * H : 0.56 * H, port ? 0.6 : 0.8, "os");

  // Falling petals from the garden
  if (!reduce)
    for (let i = 0; i < 9; i++) {
      const sx = W * (0.04 + R() * 0.26);
      const sy = H * (0.05 + R() * 0.5);
      const p = mk("ellipse", { cx: sx, cy: sy, rx: 6 + R() * 4, ry: 3 + R() * 2, fill: pick([C.coral, C.coral2, C.blush]), opacity: 0, class: "wash" }, fx);
      gsap
        .timeline({ repeat: -1, delay: R() * 8, repeatDelay: R() * 3 })
        .to(p, { opacity: 0.9, duration: 1 })
        .fromTo(p, { x: 0, y: 0, rotation: 0 }, { x: 80 + R() * 160, y: 140 + R() * 220, rotation: 180 + R() * 360, transformOrigin: "50% 50%", duration: 7 + R() * 4, ease: "sine.inOut" }, 0)
        .to(p, { opacity: 0, duration: 1.4 }, ">-1.4");
    }

  return P;
}
