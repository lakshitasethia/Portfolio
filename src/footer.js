// Blueprint footer: the CSS box model drawn as an exploded axonometric,
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

/* ── the CSS box model, exploded like an architectural axonometric ── */

function boxModel(svg, reduce) {
  svg.replaceChildren();
  const c = Math.cos(Math.PI / 6), s = 0.5;
  const OX = 300, OY = 236;
  // x runs down-right, z runs down-left, y is height
  const P = (x, z, y) => [OX + (x - z) * c, OY + (x + z) * s - y];
  const LAYERS = [
    { key: "margin", w: 300, d: 210, fill: "#e08d74", css: "margin: 32px;" },
    { key: "border", w: 236, d: 146, inset: 32, fill: "#e2b86c", css: "border: 6px solid;" },
    { key: "padding", w: 224, d: 134, inset: 6, fill: "#8c9c7f", css: "padding: 24px;" },
    { key: "content", w: 176, d: 86, inset: 24, fill: "#6f93d6", css: "width: 176px;" },
  ];
  const state = { gap: 34, hover: -1 };
  const T = 7; // plate thickness

  const g = mk("g", {}, svg);
  const guides = mk("g", { class: "bm-guides" }, g);
  const plates = LAYERS.map((L, i) => {
    const grp = mk("g", { class: "bm-plate", "data-i": i }, g);
    const sideR = mk("path", { class: "bm-side" }, grp);
    const sideL = mk("path", { class: "bm-side bm-side--dark" }, grp);
    const top = mk("path", { class: "bm-top", fill: L.fill, "fill-rule": "evenodd" }, grp);
    return { L, grp, top, sideL, sideR };
  });

  // labels + leader lines on the right, and the CSS on the far right
  const labels = LAYERS.map((L) => {
    const lead = mk("path", { class: "bm-lead" }, g);
    const dot = mk("circle", { r: 3.5, class: "bm-dot" }, g);
    const text = mk("text", { class: "bm-label" }, g);
    text.textContent = L.key;
    return { lead, dot, text };
  });
  const code = mk("g", { class: "bm-code", transform: "translate(676 132)" }, g);
  const codeLines = [".card {", ...LAYERS.map((L) => "  " + L.css), "}"].map((t, i) => {
    const e = mk("text", { x: 0, y: i * 26, class: "bm-codeline" }, code);
    e.textContent = t;
    return e;
  });

  // plates are centred: each one is inset inside the previous
  const rect = (L) => {
    const x0 = -L.w / 2, z0 = -L.d / 2;
    return [x0, z0, x0 + L.w, z0 + L.d];
  };
  const quad = (pts) => "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";

  function render() {
    let gd = "";
    plates.forEach(({ L, top, sideL, sideR }, i) => {
      const y = i * state.gap;
      const [x0, z0, x1, z1] = rect(L);
      const outer = [P(x0, z0, y), P(x1, z0, y), P(x1, z1, y), P(x0, z1, y)];
      let d = quad(outer);
      if (i < LAYERS.length - 1) {
        const N = LAYERS[i + 1];
        const [a0, b0, a1, b1] = rect(N);
        d += quad([P(a0, b0, y), P(a1, b0, y), P(a1, b1, y), P(a0, b1, y)]);
      }
      top.setAttribute("d", d);
      sideR.setAttribute("d", quad([P(x1, z0, y), P(x1, z1, y), P(x1, z1, y - T), P(x1, z0, y - T)]));
      sideL.setAttribute("d", quad([P(x0, z1, y), P(x1, z1, y), P(x1, z1, y - T), P(x0, z1, y - T)]));
      // dashed construction lines from this plate's corners down to the one below
      if (i > 0) {
        const below = (i - 1) * state.gap;
        for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
          const [ax, ay] = P(x, z, y), [bx, by] = P(x, z, below);
          gd += `M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`;
        }
      }
      // label at the plate's right-hand corner
      const [cx, cy] = P(x1, z0, y);
      const lab = labels[i];
      const lx = 600, ly = cy - 4;
      lab.dot.setAttribute("cx", cx);
      lab.dot.setAttribute("cy", cy);
      lab.lead.setAttribute("d", `M${cx} ${cy}L${lx - 10} ${ly}H${lx - 4}`);
      lab.text.setAttribute("x", lx);
      lab.text.setAttribute("y", ly + 4);
    });
    guides.replaceChildren();
    mk("path", { d: gd, class: "bm-guide" }, guides);
  }
  render();
  const fitTop = () => {
    // keep the stack inside the viewBox as it grows
    const lift = Math.max(0, (LAYERS.length - 1) * state.gap - 110);
    g.setAttribute("transform", `translate(0 ${lift.toFixed(1)})`);
  };
  fitTop();

  function highlight(k) {
    state.hover = k;
    plates.forEach((p, i) => p.grp.classList.toggle("is-dim", k >= 0 && i !== k));
    plates.forEach((p, i) => p.grp.classList.toggle("is-on", i === k));
    labels.forEach((l, i) => l.text.classList.toggle("is-on", i === k));
    codeLines.forEach((t, i) => t.classList.toggle("is-on", i - 1 === k));
  }

  if (!reduce) {
    const art = svg.closest(".ft__art");
    const cross = art.querySelectorAll(".ft__cross i");
    const toGap = gsap.quickTo(state, "gap", { duration: 0.9, ease: "power3", onUpdate: () => (render(), fitTop()) });
    art.addEventListener("pointermove", (e) => {
      const r = art.getBoundingClientRect();
      toGap(16 + gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width) * 44);
      gsap.set(cross[0], { y: e.clientY - r.top });
      gsap.set(cross[1], { x: e.clientX - r.left });
    });
    art.addEventListener("pointerleave", () => (toGap(34), highlight(-1)));
    plates.forEach((p, i) => {
      p.grp.addEventListener("pointerenter", () => highlight(i));
      p.grp.addEventListener("pointerleave", () => highlight(-1));
    });
    labels.forEach((l, i) => {
      l.text.addEventListener("pointerenter", () => highlight(i));
      l.text.addEventListener("pointerleave", () => highlight(-1));
    });
  }
  return { plates: plates.map((p) => p.grp), labels: labels.flatMap((l) => [l.lead, l.text, l.dot]), code: codeLines };
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
  const state = { D: 34 };
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
  render();
  const bb = svg.getBBox();
  svg.setAttribute("viewBox", `${bb.x - 8} ${bb.y - 8} ${bb.width + 16} ${bb.height + 16}`);
  state.D = save;
  render();

  // hover a face to paint it, the way Heron's mark does
  if (!reduce)
    svg.querySelectorAll(".iso-face").forEach((f) => {
      f.addEventListener("pointerenter", () => gsap.to(f, { fill: "#c9624a", duration: 0.25, ease: "power2.out" }));
      f.addEventListener("pointerleave", () => gsap.to(f, { fill: "#f7efe6", duration: 0.5, ease: "power2.inOut" }));
    });
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

  // ink mask: a turbulence-displaced circle, so the blot has a ragged edge
  const defs = mk("defs", {}, svg);
  const filter = mk("filter", { id: "lexi-ink", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
  mk("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.015", numOctaves: 4, seed: 5, result: "noise" }, filter);
  mk("feDisplacementMap", { in: "SourceGraphic", in2: "noise", scale: 90, xChannelSelector: "R", yChannelSelector: "G" }, filter);
  mk("feGaussianBlur", { stdDeviation: 3, result: "blurred" }, filter);
  const ct = mk("feComponentTransfer", { in: "blurred" }, filter);
  mk("feFuncA", { type: "linear", slope: 2.2, intercept: -0.6 }, ct);
  const cx = total / 2, cy = H / 2, full = Math.hypot(VW, VH) * 0.62;
  const blob = (id) => {
    const m = mk("mask", { id, maskUnits: "userSpaceOnUse", x: -padX, y: -padY, width: VW, height: VH }, defs);
    return mk("circle", { cx, cy, r: 0, fill: "#fff" }, mk("g", { filter: "url(#lexi-ink)" }, m));
  };
  const ink = blob("lexi-mask");
  const fringe = blob("lexi-fringe");

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

  // 2. solid letters, only where the ink blot is: a grey fringe, then ink
  const grey = mk("g", { class: "lx-solid lx-solid--fringe", mask: "url(#lexi-fringe)" }, svg);
  const solid = mk("g", { class: "lx-solid", mask: "url(#lexi-mask)" }, svg);
  shapes.flat().forEach((pts) => (mk("path", { d: dOf(pts) }, grey), mk("path", { d: dOf(pts) }, solid)));
  const cursor = mk("rect", { width: 9 * U / 2, height: 9 * U / 2, class: "lx-cursor", opacity: 0 }, svg);

  if (reduce) return { strokes, full };

  // the cursor carries a blot of ink that turns the drawing solid beneath it
  const local = (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  };
  const pos = { x: cx, y: cy };
  const paint = () => {
    for (const c of [ink, fringe]) c.setAttribute("cx", pos.x), c.setAttribute("cy", pos.y);
  };
  const hx = gsap.quickTo(pos, "x", { duration: 0.45, ease: "power3", onUpdate: paint });
  const hy = gsap.quickTo(pos, "y", { duration: 0.45, ease: "power3", onUpdate: paint });
  const R = 46 * U;
  const band = svg.closest(".ft__mark");
  band.addEventListener("pointerenter", (e) => {
    const [px, py] = local(e);
    pos.x = px;
    pos.y = py;
    hx(px, px);
    hy(py, py);
    paint();
    gsap.to(ink, { attr: { r: R }, duration: 0.9, ease: "expo.out", overwrite: "auto" });
    gsap.to(fringe, { attr: { r: R * 1.22 }, duration: 1.1, ease: "expo.out", overwrite: "auto" });
    gsap.to(cursor, { opacity: 1, duration: 0.2 });
  });
  band.addEventListener("pointermove", (e) => {
    const [px, py] = local(e);
    hx(px);
    hy(py);
    cursor.setAttribute("x", px - (9 * U) / 4);
    cursor.setAttribute("y", py - (9 * U) / 4);
  });
  band.addEventListener("pointerleave", () => {
    gsap.to([ink, fringe], { attr: { r: 0 }, duration: 0.7, ease: "expo.inOut", overwrite: "auto" });
    gsap.to(cursor, { opacity: 0, duration: 0.2 });
  });

  return { strokes, full };
}

/* ── assemble ── */

export function createFooter(foot, { reduce, smoother }) {
  const art = boxModel(foot.querySelector(".boxm"), reduce);
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
    .from(art.plates, { y: -140, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.12 })
    .from(art.labels, { opacity: 0, duration: 0.5, stagger: 0.03 }, 0.6)
    .from(art.code, { opacity: 0, x: 12, duration: 0.5, stagger: 0.06 }, 0.8);
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
}
