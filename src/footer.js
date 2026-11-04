// Blueprint footer: a double-slit experiment drawn like an engineering plate,
// an isometric monogram, LEXI drawn as construction letters, and rolling-text
// hover effects on every link.

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

const NS = "http://www.w3.org/2000/svg";
const mk = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
};

/* ── rolling text: letters slide up and a fresh copy slides in ── */

export function roll(el, { trigger = el } = {}) {
  if (el.dataset.roll) return;
  el.dataset.roll = "1";
  const text = el.textContent.trim();
  if (!trigger.getAttribute("aria-label")) trigger.setAttribute("aria-label", text);
  el.innerHTML = `<span class="roll" aria-hidden="true"><span class="roll__a">${text}</span><span class="roll__b">${text}</span></span>`;
  const A = SplitText.create(el.querySelector(".roll__a"), { type: "chars" }).chars;
  const B = SplitText.create(el.querySelector(".roll__b"), { type: "chars" }).chars;
  const tl = gsap
    .timeline({ paused: true, defaults: { duration: 0.42, ease: "power3.inOut", stagger: 0.016 } })
    .to(A, { yPercent: -110 }, 0)
    .fromTo(B, { yPercent: 110 }, { yPercent: 0 }, 0);
  const on = () => tl.timeScale(1).play();
  const off = () => tl.timeScale(1.4).reverse();
  trigger.addEventListener("mouseenter", on);
  trigger.addEventListener("mouseleave", off);
  trigger.addEventListener("focus", on);
  trigger.addEventListener("blur", off);
}

/* ── CTA buttons: ink sweeps in, the arrow shoots out and back ── */

function buttons(root, reduce) {
  root.querySelectorAll(".ft-btn").forEach((btn) => {
    roll(btn.querySelector(".ft-btn__label"), { trigger: btn });
    if (reduce) return;
    const fill = btn.querySelector(".ft-btn__fill");
    const a1 = btn.querySelector(".ft-btn__a1");
    const a2 = btn.querySelector(".ft-btn__a2");
    const tl = gsap.timeline({ paused: true, defaults: { duration: 0.5, ease: "expo.out" } });
    tl.fromTo(fill, { scaleX: 0, transformOrigin: "left" }, { scaleX: 1 }, 0);
    if (btn.classList.contains("ft-btn--ghost")) tl.to(btn, { color: "#f7efe6", duration: 0.3 }, 0);
    if (a1) tl.to(a1, { xPercent: 110 }, 0).fromTo(a2, { xPercent: -110 }, { xPercent: 0 }, 0.08);
    btn.addEventListener("mouseenter", () => tl.play());
    btn.addEventListener("mouseleave", () => {
      gsap.set(fill, { transformOrigin: "right" });
      tl.reverse();
    });
  });
}

/* ── Young's double slit, drawn like an engineering plate ── */

function slit(svg, reduce) {
  svg.replaceChildren();
  const C = 190; // optical axis
  const SX = 110, BX = 330, SCX = 640; // source, barrier, screen
  const state = { lam: 22, d: 64, phase: 0 };
  const g = mk("g", {}, svg);
  const lines = [];
  const L = (d, cls = "d") => {
    const e = mk("path", { d, class: cls }, g);
    lines.push(e);
    return e;
  };

  // construction
  L(`M30 ${C} H780`, "d-faint");
  L(`M${BX} 20 V360 M${SCX} 20 V360`, "d-faint");
  L(`M${BX} 352 H${SCX} M${BX} 346 V358 M${SCX} 346 V358`);
  mk("text", { x: (BX + SCX) / 2, y: 345, "text-anchor": "middle", class: "d-label" }, g).textContent = "L";
  for (const [x, y] of [[SX, C], [BX, 30], [SCX, 30], [SCX, 350], [BX, 350]])
    L(`M${x - 6} ${y} H${x + 6} M${x} ${y - 6} V${y + 6}`);

  // source: the red sun
  const sun = mk("circle", { cx: SX, cy: C, r: 46, class: "d-sun" }, g);

  // plane wavefronts between source and barrier
  const plane = mk("path", { class: "d-wave" }, g);

  // circular wavefronts from each slit, clipped to the space after the barrier
  const clip = mk("clipPath", { id: "slit-clip" }, mk("defs", {}, svg));
  mk("rect", { x: BX, y: 20, width: SCX - BX, height: 340 }, clip);
  const arcs = mk("path", { class: "d-wave", "clip-path": "url(#slit-clip)" }, g);

  // barrier with two slits
  const barrier = mk("path", { class: "d-barrier" }, g);
  const dimD = mk("path", { class: "d" }, g);
  const dLabel = mk("text", { class: "d-label" }, g);
  dLabel.textContent = "d";

  // screen, fringes and the intensity curve
  L(`M${SCX} 30 V350`, "d-thick");
  const fringes = mk("g", {}, g);
  const bars = Array.from({ length: 64 }, (_, i) => mk("rect", { x: SCX + 4, y: 30 + i * 5, width: 12, height: 5, class: "d-fringe" }, fringes));
  const curve = mk("path", { class: "d-intensity" }, g);
  const lamLabel = mk("text", { x: 220, y: 54, "text-anchor": "middle", class: "d-label" }, g);
  const eqLabel = mk("text", { x: 700, y: 30, class: "d-label d-label--eq" }, g);
  eqLabel.textContent = "Δy = λL / d";
  const dyLabel = mk("text", { x: 700, y: 46, class: "d-label" }, g);

  function render() {
    const { lam, d, phase } = state;
    const s1 = C - d / 2, s2 = C + d / 2, gap = 7;
    // plane waves
    let p = "";
    for (let x = SX + 50 + (phase % lam); x < BX; x += lam) p += `M${x.toFixed(1)} ${C - 120} V${C + 120}`;
    plane.setAttribute("d", p);
    // arcs
    let a = "";
    for (const sy of [s1, s2])
      for (let r = phase % lam; r < 360; r += lam)
        if (r > 2) a += `M${BX} ${sy - r} A${r} ${r} 0 0 1 ${BX} ${sy + r}`;
    arcs.setAttribute("d", a);
    barrier.setAttribute("d", `M${BX} 40 V${s1 - gap} M${BX} ${s1 + gap} V${s2 - gap} M${BX} ${s2 + gap} V340`);
    dimD.setAttribute("d", `M${BX - 22} ${s1} V${s2} M${BX - 28} ${s1} H${BX - 16} M${BX - 28} ${s2} H${BX - 16}`);
    dLabel.setAttribute("x", BX - 40);
    dLabel.setAttribute("y", C + 4);
    // intensity on the screen: two-slit pattern under a single-slit envelope
    const Ld = SCX - BX;
    let c = "";
    bars.forEach((b, i) => {
      const y = 30 + i * 5 + 2.5 - C;
      const th = Math.atan2(y, Ld);
      const beta = (Math.PI * 14 * Math.sin(th)) / lam;
      const env = beta === 0 ? 1 : (Math.sin(beta) / beta) ** 2;
      const I = Math.cos((Math.PI * d * Math.sin(th)) / lam) ** 2 * env;
      b.setAttribute("opacity", (0.08 + 0.92 * I).toFixed(3));
    });
    for (let y = 30; y <= 350; y += 2) {
      const th = Math.atan2(y - C, Ld);
      const beta = (Math.PI * 14 * Math.sin(th)) / lam;
      const env = beta === 0 ? 1 : (Math.sin(beta) / beta) ** 2;
      const I = Math.cos((Math.PI * d * Math.sin(th)) / lam) ** 2 * env;
      c += `${y === 30 ? "M" : "L"}${(SCX + 24 + I * 120).toFixed(1)} ${y}`;
    }
    curve.setAttribute("d", c);
    lamLabel.textContent = `λ = ${lam.toFixed(1)}`;
    dyLabel.textContent = `Δy = ${((lam * Ld) / d).toFixed(0)}`;
  }
  render();

  if (!reduce) {
    gsap.to(state, { phase: 1e4, duration: 1e4 / 26, ease: "none", repeat: -1, onUpdate: render });
    const art = svg.closest(".ft__art");
    const cross = art.querySelectorAll(".ft__cross i");
    art.addEventListener("pointermove", (e) => {
      const r = art.getBoundingClientRect();
      const u = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width);
      const v = gsap.utils.clamp(0, 1, (e.clientY - r.top) / r.height);
      gsap.to(state, { lam: 12 + u * 26, d: 40 + v * 70, duration: 0.8, ease: "power3", overwrite: "auto" });
      gsap.set(cross[0], { y: e.clientY - r.top });
      gsap.set(cross[1], { x: e.clientX - r.left });
    });
  }
  return { lines, sun, waves: [plane, arcs], curve, bars };
}

/* ── isometric extruded monogram, like an architect's mark ── */

function iso(svg, reduce) {
  svg.replaceChildren();
  const H = 100, t = 26;
  const glyphs = [
    { x: 0, pts: [[0, 0], [t, 0], [t, H - t], [64, H - t], [64, H], [0, H]] },
    {
      x: 80,
      pts: (() => {
        const w = 66, m0 = (H - t) / 2, m1 = (H + t) / 2;
        return [[0, 0], [w, 0], [w, t], [t, t], [t, m0], [w, m0], [w, H], [0, H], [0, H - t], [w - t, H - t], [w - t, m1], [0, m1]];
      })(),
    },
  ];
  const c = Math.cos(Math.PI / 6), sn = 0.5;
  // isometric: x runs up-right, y runs down, depth z runs up-left
  const proj = (x, y, z) => [(x - z) * c, y - (x + z) * sn];
  const state = { D: 30 };
  const parts = [];
  // farther solid first: S sits behind L in this view
  const solids = glyphs
    .slice()
    .reverse()
    .map((gl) => {
      const grp = mk("g", {}, svg);
      const P = gl.pts.map(([x, y]) => [x + gl.x, y]);
      const n = P.length;
      // Only faces turned towards the viewer (outward normal −x or −y) are
      // drawn, far to near, then the front face on top.
      const inside = (x, y) => {
        let c = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = P[i], [xj, yj] = P[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
        }
        return c;
      };
      const back = null;
      const sides = P.map((a, i) => {
        const b = P[(i + 1) % n];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        let nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if (inside(mx + nx * 0.5, my + ny * 0.5)) (nx = -nx), (ny = -ny);
        return { i, visible: nx + ny < 0, key: mx + my };
      })
        .filter((f) => f.visible)
        .sort((a, b) => b.key - a.key)
        .map(({ i }) => ({ i, el: mk("path", { class: "iso-face" }, grp) }));
      const front = mk("path", { class: "iso-face" }, grp);
      parts.push(grp);
      return { P, n, back, sides, front };
    });

  const ptsStr = (arr) => "M" + arr.map((q) => q.map((v) => v.toFixed(2)).join(" ")).join("L") + "Z";
  function render() {
    const D = state.D;
    solids.forEach(({ P, n, sides, front }) => {
      sides.forEach(({ i, el }) => {
        const a = P[i], b = P[(i + 1) % n];
        el.setAttribute("d", ptsStr([proj(a[0], a[1], 0), proj(b[0], b[1], 0), proj(b[0], b[1], D), proj(a[0], a[1], D)]));
      });
      front.setAttribute("d", ptsStr(P.map(([x, y]) => proj(x, y, 0))));
    });
  }
  render();
  // fit the viewBox around the deepest extrusion we animate to
  const save = state.D;
  state.D = 56;
  render();
  const bb = svg.getBBox();
  svg.setAttribute("viewBox", `${bb.x - 8} ${bb.y - 8} ${bb.width + 16} ${bb.height + 16}`);
  state.D = save;
  render();

  if (!reduce) {
    const tl = gsap.timeline({ paused: true })
      .to(state, { D: 56, duration: 0.9, ease: "elastic.out(1, 0.5)", onUpdate: render })
      .to(parts[1], { y: -10, duration: 0.6, ease: "expo.out" }, 0)
      .to(parts[0], { y: -4, duration: 0.6, ease: "expo.out" }, 0.05);
    const cell = svg.closest(".cell");
    cell.addEventListener("mouseenter", () => tl.play());
    cell.addEventListener("mouseleave", () => tl.reverse());
  }
  return { faces: [...svg.querySelectorAll(".iso-face")] };
}

/* ── LEXI, the way Heron draws its wordmark ──
   A pencil construction drawing of the letters sits underneath; a solid
   ink copy sits on top, shown through an ink-blot mask. Scrolling in floods
   the ink from the centre; the cursor wipes it back off to show the drawing. */

function lexi(svg, reduce) {
  svg.replaceChildren();
  const U = 6; // drawing units → svg units
  const H = 100 * U, t = 17 * U, gap = 21 * U;
  const glyphs = [
    { w: 62 * U, polys: (w) => [[[0, 0], [t, 0], [t, H - t], [w, H - t], [w, H], [0, H]]] },
    {
      w: 64 * U,
      polys: (w) => {
        const m0 = (H - t) / 2, m1 = (H + t) / 2, mw = w * 0.92;
        return [[[0, 0], [w, 0], [w, t], [t, t], [t, m0], [mw, m0], [mw, m1], [t, m1], [t, H - t], [w, H - t], [w, H], [0, H]]];
      },
    },
    {
      w: 82 * U,
      polys: (w) => {
        const a = t * 1.3, y1 = (H * (w / 2 - a)) / (w - a);
        return [[[0, 0], [a, 0], [w / 2, y1], [w - a, 0], [w, 0], [(w + a) / 2, H / 2], [w, H], [w - a, H], [w / 2, H - y1], [a, H], [0, H], [(w - a) / 2, H / 2]]];
      },
    },
    { w: t, polys: () => [[[0, 0], [t, 0], [t, H], [0, H]]] },
  ];
  const total = glyphs.reduce((sum, g) => sum + g.w, 0) + gap * (glyphs.length - 1);
  const padX = 30 * U, padY = 14 * U;
  const VW = total + padX * 2, VH = H + padY * 2;
  svg.setAttribute("viewBox", `${-padX} ${-padY} ${VW} ${VH}`);

  let x = 0;
  const shapes = glyphs.map((g) => {
    const polys = g.polys(g.w).map((pts) => pts.map(([px, py]) => [px + x, py]));
    x += g.w + gap;
    return polys;
  });
  const dOf = (pts) => "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";

  // ink mask: a turbulence-displaced circle (the ink) with a hole the cursor drags
  const defs = mk("defs", {}, svg);
  const filter = mk("filter", { id: "lexi-ink", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
  mk("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.015", numOctaves: 4, seed: 5, result: "noise" }, filter);
  mk("feDisplacementMap", { in: "SourceGraphic", in2: "noise", scale: 90, xChannelSelector: "R", yChannelSelector: "G" }, filter);
  mk("feGaussianBlur", { stdDeviation: 3, result: "blurred" }, filter);
  const ct = mk("feComponentTransfer", { in: "blurred" }, filter);
  mk("feFuncA", { type: "linear", slope: 2.2, intercept: -0.6 }, ct);
  const mask = mk("mask", { id: "lexi-mask", maskUnits: "userSpaceOnUse", x: -padX, y: -padY, width: VW, height: VH }, defs);
  const inkG = mk("g", { filter: "url(#lexi-ink)" }, mask);
  const cx = total / 2, cy = H / 2, full = Math.hypot(VW, VH) * 0.62;
  const ink = mk("circle", { cx, cy, r: 0, fill: "#fff" }, inkG);
  const hole = mk("circle", { cx, cy, r: 0, fill: "#000" }, inkG);

  // 1. construction drawing
  const sketch = mk("g", { class: "lx-sketch" }, svg);
  const strokes = [];
  const line = (x1, y1, x2, y2, cls = "lx-line") => strokes.push(mk("line", { x1, y1, x2, y2, class: cls }, sketch));
  const o = 3.5 * U; // drafting overshoot past each corner
  shapes.flat().forEach((pts) => {
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      line(a[0] - ux * o, a[1] - uy * o, b[0] + ux * o, b[1] + uy * o);
      // a faint second pass along part of the edge, like a re-drawn pencil line
      if (len > 40 * U)
        line(a[0] + uy * 2, a[1] - ux * 2, a[0] + uy * 2 + ux * len * 0.6, a[1] - ux * 2 + uy * len * 0.6, "lx-line lx-line--faint");
      // a small tick across the middle of long edges
      if (len > 34 * U) {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, k = 3 * U;
        line(mx - uy * k, my + ux * k, mx + uy * k, my - ux * k);
      }
    });
  });
  line(cx - 4 * U, cy, cx + 4 * U, cy);
  line(cx, cy - 4 * U, cx, cy + 4 * U);

  // 2. solid ink letters, through the mask
  const solid = mk("g", { class: "lx-solid", mask: "url(#lexi-mask)" }, svg);
  shapes.flat().forEach((pts) => mk("path", { d: dOf(pts) }, solid));

  if (reduce) {
    ink.setAttribute("r", full);
    return { strokes, ink: null, full };
  }

  // the cursor wipes the ink off and shows the drawing underneath
  const local = (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  };
  const pos = { x: cx, y: cy };
  const paint = () => (hole.setAttribute("cx", pos.x), hole.setAttribute("cy", pos.y));
  const hx = gsap.quickTo(pos, "x", { duration: 0.6, ease: "power3", onUpdate: paint });
  const hy = gsap.quickTo(pos, "y", { duration: 0.6, ease: "power3", onUpdate: paint });
  const band = svg.closest(".ft__mark");
  band.addEventListener("pointerenter", (e) => {
    const [px, py] = local(e);
    pos.x = px;
    pos.y = py;
    hx(px, px);
    hy(py, py);
    paint();
    gsap.to(hole, { attr: { r: 34 * U }, duration: 0.8, ease: "expo.out", overwrite: "auto" });
  });
  band.addEventListener("pointermove", (e) => {
    const [px, py] = local(e);
    hx(px);
    hy(py);
  });
  band.addEventListener("pointerleave", () => gsap.to(hole, { attr: { r: 0 }, duration: 0.8, ease: "expo.inOut", overwrite: "auto" }));

  return { strokes, ink, full };
}

/* ── assemble ── */

export function createFooter(foot, { reduce, smoother }) {
  const art = slit(foot.querySelector(".slit"), reduce);
  const letters = lexi(foot.querySelector(".lexi"), reduce);
  const mark = iso(foot.querySelector(".iso"), reduce);
  buttons(foot, reduce);
  foot.querySelectorAll(".cell a, .ft__baselink").forEach((a) => roll(a));

  // dashed guides only span the CTA + figure rows
  const guides = foot.querySelector(".ft__guides");
  const setGuides = () => guides.style.setProperty("--guides-h", `${foot.querySelector(".ft__grid").offsetTop}px`);
  setGuides();
  addEventListener("resize", setGuides);

  // live coordinates, like a drafting table
  const coords = foot.querySelector(".ft__coords");
  foot.addEventListener("pointermove", (e) => {
    const r = foot.getBoundingClientRect();
    coords.textContent = `[${Math.round(e.clientX - r.left)},${Math.round(e.clientY - r.top)}]`;
  });

  // clock, copy, back to top
  const clock = foot.querySelector(".clock");
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 10000);
  foot.querySelector(".totop").addEventListener("click", () =>
    smoother ? smoother.scrollTo(0, true) : scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
  );
  const copy = foot.querySelector(".copy");
  const email = foot.querySelector(".ft__mail").getAttribute("href").replace("mailto:", "");
  const toast = document.createElement("span");
  toast.className = "ft-btn__toast";
  toast.setAttribute("aria-hidden", "true");
  copy.appendChild(toast);
  copy.addEventListener("click", async () => {
    let msg = "Copied";
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      msg = "Select it below";
    }
    toast.textContent = msg;
    copy.setAttribute("aria-label", msg);
    gsap.timeline()
      .fromTo(toast, { yPercent: 101 }, { yPercent: 0, duration: 0.45, ease: "expo.out" })
      .to(toast, { yPercent: -101, duration: 0.45, ease: "expo.in", delay: 1.4 })
      .add(() => copy.setAttribute("aria-label", "Copy email"));
  });

  if (reduce) return;

  gsap.from(guides.children, {
    scaleY: 0, duration: 1.4, ease: "expo.inOut", stagger: 0.1,
    scrollTrigger: { trigger: foot, start: "top 85%" },
  });
  const title = SplitText.create(foot.querySelector(".ft__title"), { type: "words", mask: "words" });
  gsap.from(title.words, {
    yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.05,
    scrollTrigger: { trigger: foot, start: "top 75%" },
  });
  gsap.timeline({ scrollTrigger: { trigger: foot.querySelector(".ft__art"), start: "top 80%" } })
    .from(art.lines, { drawSVG: 0, duration: 1.2, ease: "power2.inOut", stagger: 0.04 })
    .from(art.sun, { scale: 0, transformOrigin: "50% 50%", duration: 1, ease: "back.out(1.8)" }, 0.3)
    .from(art.waves, { opacity: 0, duration: 1 }, 0.8)
    .from(art.bars, { scaleX: 0, transformOrigin: "0% 50%", duration: 0.5, stagger: 0.01 }, 1)
    .from(art.curve, { drawSVG: 0, duration: 1.2, ease: "power2.inOut" }, 1.2);
  gsap.from(mark.faces, {
    drawSVG: 0, fillOpacity: 0, duration: 1.2, ease: "power2.inOut", stagger: 0.02,
    scrollTrigger: { trigger: foot.querySelector(".ft__grid"), start: "top 85%" },
  });
  gsap.from(foot.querySelectorAll(".cell > *"), {
    y: 18, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.03,
    scrollTrigger: { trigger: foot.querySelector(".ft__grid"), start: "top 85%" },
  });
  gsap.from(letters.strokes, {
    drawSVG: 0, duration: 1.4, ease: "power2.inOut", stagger: { each: 0.004, from: "random" },
    scrollTrigger: { trigger: foot.querySelector(".ft__mark"), start: "top 95%" },
  });
  gsap.to(letters.ink, {
    attr: { r: letters.full }, ease: "power1.in",
    scrollTrigger: { trigger: foot.querySelector(".ft__mark"), start: "top 70%", end: "bottom bottom", scrub: 0.6 },
  });
}
