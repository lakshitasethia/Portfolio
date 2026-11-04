// Toolkit playground.
// Stickers are tied together with strings (verlet ropes). Throw one and the
// whole set glides into the next figure; the strings re-tie along the new
// shape. Run the cursor across a string to cut it — it snaps, the halves
// swing and fade, and a few seconds later it grows back.

import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

const TAU = Math.PI * 2;
const ring = (n, r, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => [Math.cos(a0 + (i / n) * TAU) * r, Math.sin(a0 + (i / n) * TAU) * r]);
const chain = (from, to) => Array.from({ length: to - from }, (_, i) => [from + i, from + i + 1]);
const loop = (from, n) => [...chain(from, from + n - 1), [from + n - 1, from]];

const FIGURES = [
  (() => {
    const pts = [[0, 0], ...ring(5, 0.52), ...ring(6, 1, -Math.PI / 2 + Math.PI / 6)];
    const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], ...loop(1, 5), ...loop(6, 6)];
    for (let o = 6; o < 12; o++) {
      let best = 1;
      for (let i = 1; i <= 5; i++) if (Math.hypot(pts[o][0] - pts[i][0], pts[o][1] - pts[i][1]) < Math.hypot(pts[o][0] - pts[best][0], pts[o][1] - pts[best][1])) best = i;
      edges.push([best, o]);
    }
    return { name: "A flower", pts, edges, ax: 1 };
  })(),
  (() => {
    // an atom: a nucleus and three tilted elliptical orbits
    const pts = [[0, 0]];
    const edges = [];
    [[0, 4], [Math.PI / 3, 4], [-Math.PI / 3, 3]].forEach(([tilt, k]) => {
      const start = pts.length;
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2 + 0.4;
        const x = Math.cos(a), y = Math.sin(a) * 0.36;
        pts.push([x * Math.cos(tilt) - y * Math.sin(tilt), (x * Math.sin(tilt) + y * Math.cos(tilt)) * 1.05]);
      }
      for (let i = 0; i < k; i++) edges.push([start + i, start + ((i + 1) % k)]);
    });
    edges.push([0, 1], [0, 5], [0, 9]);
    return { name: "An atom", pts, edges, ax: 1 };
  })(),
  (() => {
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k / 6) * TAU;
      pts.push([Math.cos(a), Math.sin(a)]);
      pts.push([Math.cos(a + Math.PI / 6) * 0.5, Math.sin(a + Math.PI / 6) * 0.5]);
    }
    return { name: "A star", pts, edges: loop(0, 12), ax: 1 };
  })(),
  {
    name: "A spiral",
    pts: Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      const r = 0.12 + 0.88 * t;
      const a = t * 3.3 * Math.PI;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }),
    edges: chain(0, 11),
    ax: 1.1,
  },
  {
    name: "A vine",
    pts: Array.from({ length: 12 }, (_, i) => {
      const x = -1 + (i / 11) * 2;
      return [x, Math.sin(x * Math.PI * 1.15) * 0.55 + (i % 2 ? 0.22 : -0.22)];
    }),
    edges: [...chain(0, 11), [0, 2], [3, 5], [6, 8], [9, 11]],
    ax: 2.3,
  },
];

export function createToolkit(pit, { reduce = false } = {}) {
  const stickers = [...pit.querySelectorAll(".sticker")];
  const caption = pit.parentElement.querySelector(".toolkit__caption");
  const canvas = document.createElement("canvas");
  canvas.className = "toolkit__strings";
  canvas.setAttribute("aria-hidden", "true");
  pit.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0;
  const size = new Map();
  function resize() {
    W = pit.clientWidth;
    H = pit.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stickers.forEach((s) => size.set(s, [s.offsetWidth, s.offsetHeight]));
  }
  resize();

  const center = (s) => {
    const [w, h] = size.get(s);
    return [gsap.getProperty(s, "x") + w / 2, gsap.getProperty(s, "y") + h / 2];
  };
  const clamp = gsap.utils.clamp;

  let ropes = [];
  let sparks = [];
  let fig = -1;
  let dragging = false;

  /* ── strings ── */

  function makeRope(a, b, L0, { grown = false, delay = 0 } = {}) {
    const n = 16;
    const [ax, ay] = center(a);
    const [bx, by] = center(b);
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const x = ax + ((bx - ax) * i) / n;
      const y = ay + ((by - ay) * i) / n;
      return { x, y, px: x, py: y };
    });
    const r = { a, b, L0, n, pts, cut: -1, grow: grown ? 1 : 0, dying: 0, fade: 500, fig };
    if (!grown) gsap.to(r, { grow: 1, duration: 1.2, ease: "power2.inOut", delay });
    return r;
  }

  function stepRope(r) {
    const [ax, ay] = center(r.a);
    const [bx, by] = center(r.b);
    const d = Math.hypot(bx - ax, by - ay);
    const seg = Math.max(r.L0 * 1.07, d) / r.n;
    const P = r.pts;
    for (let i = 1; i < r.n; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * 0.975;
      const vy = (p.y - p.py) * 0.975;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + 0.28;
    }
    P[0].x = P[0].px = ax;
    P[0].y = P[0].py = ay;
    P[r.n].x = P[r.n].px = bx;
    P[r.n].y = P[r.n].py = by;
    for (let it = 0; it < 10; it++) {
      for (let i = 0; i < r.n; i++) {
        if (i === r.cut) continue;
        const p = P[i];
        const q = P[i + 1];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (dist - seg) / dist;
        const pinP = i === 0;
        const pinQ = i + 1 === r.n;
        const kp = pinP ? 0 : pinQ ? 1 : 0.5;
        const kq = pinQ ? 0 : pinP ? 1 : 0.5;
        p.x += dx * diff * kp;
        p.y += dy * diff * kp;
        q.x -= dx * diff * kq;
        q.y -= dy * diff * kq;
      }
    }
  }

  function strokePath(P, from, to) {
    if (to <= from) return;
    ctx.beginPath();
    ctx.moveTo(P[from].x, P[from].y);
    for (let i = from + 1; i < to; i++) {
      const mx = (P[i].x + P[i + 1].x) / 2;
      const my = (P[i].y + P[i + 1].y) / 2;
      ctx.quadraticCurveTo(P[i].x, P[i].y, mx, my);
    }
    ctx.lineTo(P[to].x, P[to].y);
    ctx.stroke();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    for (const r of ropes) {
      let a = 1;
      if (r.dying) a = now < r.dying ? 1 : 1 - (now - r.dying) / r.fade;
      if (a <= 0 || r.grow <= 0) continue;
      ctx.strokeStyle = `rgba(227, 235, 255, ${0.7 * a})`;
      ctx.lineWidth = 1.4;
      const P = r.pts;
      if (r.cut < 0) {
        strokePath(P, 0, Math.max(1, Math.round(r.grow * r.n)));
      } else {
        strokePath(P, 0, r.cut);
        strokePath(P, r.cut + 1, r.n);
      }
      ctx.fillStyle = `rgba(226, 184, 108, ${a})`;
      for (const p of [P[0], P[r.n]]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, TAU);
        ctx.fill();
      }
    }
    for (const s of sparks) {
      ctx.fillStyle = `rgba(226, 184, 108, ${s.life})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2 * s.life + 0.4, 0, TAU);
      ctx.fill();
    }
  }

  function tick() {
    const now = performance.now();
    ropes = ropes.filter((r) => !r.dying || now < r.dying + r.fade);
    ropes.forEach(stepRope);
    sparks = sparks.filter((s) => (s.life -= 0.025) > 0);
    sparks.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.15;
      s.vx *= 0.97;
    });
    draw(now);
  }

  let visible = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !visible) gsap.ticker.add(tick);
    if (!e.isIntersecting && visible) gsap.ticker.remove(tick);
    visible = e.isIntersecting;
  }).observe(pit);

  /* ── cutting ── */

  const cross = (a, b, c, d) => {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  };

  let last = null;
  pit.addEventListener("pointermove", (e) => {
    const rect = pit.getBoundingClientRect();
    const p = [e.clientX - rect.left, e.clientY - rect.top];
    if (last && !dragging) {
      const now = performance.now();
      for (const r of ropes) {
        if (r.cut >= 0 || r.dying || r.grow < 0.98) continue;
        for (let i = 0; i < r.n; i++) {
          const a = [r.pts[i].x, r.pts[i].y];
          const b = [r.pts[i + 1].x, r.pts[i + 1].y];
          if (!cross(last, p, a, b)) continue;
          r.cut = i;
          r.dying = now + 1400;
          r.fade = 1600;
          // flick the loose ends in the direction of the cut
          const vx = (p[0] - last[0]) * 0.5;
          const vy = (p[1] - last[1]) * 0.5;
          r.pts[i].px -= vx;
          r.pts[i].py -= vy;
          r.pts[i + 1].px -= vx;
          r.pts[i + 1].py -= vy;
          const cx = (a[0] + b[0]) / 2;
          const cy = (a[1] + b[1]) / 2;
          for (let k = 0; k < 9; k++)
            sparks.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.9) * 4, life: 1 });
          // the string grows back if the figure is still standing
          const { a: sa, b: sb, L0, fig: f } = r;
          gsap.delayedCall(4, () => {
            if (f === fig) ropes.push(makeRope(sa, sb, L0));
          });
          break;
        }
      }
    }
    last = p;
  });
  pit.addEventListener("pointerleave", () => (last = null));

  /* ── figures ── */

  function targets(f) {
    const s = Math.min(W * 0.38, H * 0.42);
    const cx = W / 2;
    const cy = H * 0.5;
    const sx = Math.min(s * f.ax, W * 0.44);
    return f.pts.map(([x, y]) => [cx + x * sx, cy + y * s]);
  }

  function form(index, { instant = false, ease = "power3.inOut", duration = 1.5 } = {}) {
    fig = index % FIGURES.length;
    const F = FIGURES[fig];
    const T = targets(F);

    // nearest-first assignment keeps every sticker's trip short
    const pairs = [];
    T.forEach((t, ti) =>
      stickers.forEach((s) => {
        const c = center(s);
        pairs.push([Math.hypot(c[0] - t[0], c[1] - t[1]), ti, s]);
      })
    );
    pairs.sort((p, q) => p[0] - q[0]);
    const slot = new Array(T.length);
    const usedT = new Set();
    const usedS = new Set();
    for (const [, ti, s] of pairs) {
      if (usedT.has(ti) || usedS.has(s)) continue;
      slot[ti] = s;
      usedT.add(ti);
      usedS.add(s);
    }

    const now = performance.now();
    ropes.forEach((r) => {
      if (!r.dying) {
        r.dying = now;
        r.fade = 400;
      }
    });

    slot.forEach((s, ti) => {
      const [w, h] = size.get(s);
      const x = clamp(0, W - w, T[ti][0] - w / 2);
      const y = clamp(0, H - h, T[ti][1] - h / 2);
      const rotation = gsap.utils.random(-7, 7);
      if (instant) gsap.set(s, { x, y, rotation });
      else gsap.to(s, { x, y, rotation, duration, ease, delay: ti * 0.035, overwrite: "auto" });
    });

    F.edges.forEach(([i, j], k) => {
      const L0 = Math.hypot(T[i][0] - T[j][0], T[i][1] - T[j][1]);
      ropes.push(makeRope(slot[i], slot[j], L0, { grown: instant, delay: instant ? 0 : 0.5 + k * 0.05 }));
    });

    if (caption) {
      const text = `${F.name}. Throw another to change it.`;
      if (instant || reduce) caption.textContent = text;
      else gsap.to(caption, { duration: 1, delay: 0.6, scrambleText: { text, chars: "◇◆○●□■", speed: 0.5 } });
    }
  }

  /* ── dragging & throwing ── */

  let pending = null;
  const next = () => {
    pending?.kill();
    pending = gsap.delayedCall(0.2, () => form(fig + 1));
  };

  Draggable.create(stickers, {
    bounds: pit,
    inertia: !reduce,
    edgeResistance: 0.7,
    zIndexBoost: true,
    onPress() {
      dragging = true;
      pending?.kill();
      gsap.killTweensOf(this.target, "x,y,rotation");
      gsap.to(this.target, { scale: 1.08, duration: 0.2 });
    },
    onDrag() {
      gsap.to(this.target, { rotation: clamp(-30, 30, this.deltaX * 1.6), duration: 0.5 });
    },
    onRelease() {
      dragging = false;
      gsap.to(this.target, { scale: 1, duration: 0.4, ease: "back.out(3)" });
      if (!this.isThrowing) next();
    },
    onThrowComplete: next,
  });

  // Waiting above the section until it scrolls into view.
  if (!reduce)
    stickers.forEach((s) => {
      const [w] = size.get(s);
      gsap.set(s, { x: gsap.utils.random(0, W - w), y: -pit.offsetTop - 260, rotation: gsap.utils.random(-30, 30) });
    });

  return {
    enter() {
      // Drop in from above straight into the first figure.
      form(0, { ease: "expo.out", duration: 1.8 });
    },
    instant() {
      stickers.forEach((s) => {
        const [w, h] = size.get(s);
        gsap.set(s, { x: (W - w) / 2, y: (H - h) / 2 });
      });
      form(0, { instant: true });
    },
    resize() {
      resize();
      if (fig >= 0) form(fig, { instant: true });
    },
  };
}
